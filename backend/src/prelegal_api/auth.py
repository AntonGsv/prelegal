"""Real accounts for PL-7: registration, login, and Bearer-token sessions.

The backend stays stateless like the rest of the API — there is no server-side
session store. A successful register/login returns a signed token (see
`security.create_token`) that the frontend keeps in `localStorage` and sends as
`Authorization: Bearer <token>` on subsequent requests. `user_from_token`
reverses that for the protected document-history endpoints.

Domain logic lives here; `main.py` only maps the exceptions below to HTTP status
codes, mirroring how `document_chat`/`document_detect` are structured.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field

from . import security
from .database import create_user, get_user_by_email, get_user_by_id

_MIN_PASSWORD_LENGTH = 8

# A valid hash used to equalize login timing when the email is unknown, so an
# attacker can't distinguish "no such account" from "wrong password" by response
# time (email enumeration). Computed once at import.
_TIMING_EQUALIZER_HASH = security.hash_password("prelegal-timing-equalizer")


class AuthError(Exception):
    """Base class for auth failures that map to specific HTTP responses."""


class EmailTakenError(AuthError):
    """Registration attempted with an email that already exists (→ 409)."""


class InvalidCredentialsError(AuthError):
    """Login with an unknown email or wrong password (→ 401)."""


class InvalidTokenError(AuthError):
    """A missing, malformed, or expired Bearer token (→ 401)."""


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=_MIN_PASSWORD_LENGTH)
    display_name: Optional[str] = Field(default=None, alias="displayName")

    model_config = {"populate_by_name": True}


class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str] = Field(default=None, alias="displayName")

    model_config = {"populate_by_name": True}


class AuthResponse(BaseModel):
    token: str
    user: UserOut


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _is_valid_email(email: str) -> bool:
    # Deliberately light: the frontend enforces a proper email; this just rejects
    # obvious garbage without pulling in the `email-validator` dependency.
    if email.count("@") != 1:
        return False
    local, _, domain = email.partition("@")
    return bool(local) and "." in domain and not domain.startswith(".")


def _user_out(user: dict) -> UserOut:
    return UserOut(id=user["id"], email=user["email"], displayName=user["display_name"])


def _issue(user: dict, secret: str, ttl_seconds: int) -> AuthResponse:
    token = security.create_token(user["id"], user["email"], secret, ttl_seconds)
    return AuthResponse(token=token, user=_user_out(user))


def register(
    request: RegisterRequest, database_url: str, secret: str, ttl_seconds: int
) -> AuthResponse:
    email = normalize_email(request.email)
    if not _is_valid_email(email):
        raise AuthError("Enter a valid email address")

    if get_user_by_email(database_url, email) is not None:
        raise EmailTakenError("An account with this email already exists")

    display_name = (request.display_name or "").strip() or None
    password_hash = security.hash_password(request.password)
    try:
        user = create_user(database_url, email, display_name, password_hash)
    except Exception:
        # A concurrent registration may have inserted the same email between the
        # check above and this insert (the UNIQUE constraint then fires). Surface
        # that race as a clean 409 rather than a 500.
        if get_user_by_email(database_url, email) is not None:
            raise EmailTakenError("An account with this email already exists")
        raise
    return _issue(user, secret, ttl_seconds)


def authenticate(
    request: LoginRequest, database_url: str, secret: str, ttl_seconds: int
) -> AuthResponse:
    email = normalize_email(request.email)
    user = get_user_by_email(database_url, email)
    if user is None:
        # Burn the same PBKDF2 cost as a real verify so login time doesn't reveal
        # whether the email exists.
        security.verify_password(request.password, _TIMING_EQUALIZER_HASH)
        raise InvalidCredentialsError("Incorrect email or password")
    if not security.verify_password(request.password, user["password_hash"]):
        raise InvalidCredentialsError("Incorrect email or password")
    return _issue(user, secret, ttl_seconds)


def user_from_token(
    authorization: Optional[str], database_url: str, secret: str
) -> UserOut:
    """Resolve the current user from an ``Authorization: Bearer <token>`` header."""

    if not authorization or not authorization.lower().startswith("bearer "):
        raise InvalidTokenError("Missing bearer token")

    token = authorization[len("bearer ") :].strip()
    payload = security.decode_token(token, secret)
    if payload is None:
        raise InvalidTokenError("Invalid or expired token")

    user = get_user_by_id(database_url, int(payload["sub"]))
    if user is None:
        raise InvalidTokenError("Account no longer exists")
    return _user_out(user)
