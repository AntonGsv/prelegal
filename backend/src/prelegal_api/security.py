"""Password hashing and signed session tokens, using only the standard library.

PL-7 introduces real accounts. The project deliberately avoids native-wheel
dependencies (see the libSQL fallback in `database.py`), so rather than pull in
`bcrypt`/`argon2`/`pyjwt`, both password hashing and the session token are built
on `hashlib`/`hmac`. This is more than adequate for the V1 platform: PBKDF2-HMAC
is a standard password KDF, and the token is a compact HMAC-signed structure
(the same shape as a JWT, minus the third-party dependency).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

_PBKDF2_ALGORITHM = "pbkdf2_sha256"
_PBKDF2_ITERATIONS = 240_000
_SALT_BYTES = 16


def hash_password(password: str) -> str:
    """Hash a plaintext password into a self-describing string.

    Format: ``pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>``. The salt and
    iteration count travel with the hash so `verify_password` needs nothing else.
    """

    salt = secrets.token_bytes(_SALT_BYTES)
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS
    )
    return (
        f"{_PBKDF2_ALGORITHM}${_PBKDF2_ITERATIONS}$"
        f"{salt.hex()}${derived.hex()}"
    )


def verify_password(password: str, stored: str) -> bool:
    """Check a plaintext password against a `hash_password` string."""

    try:
        algorithm, iterations_text, salt_hex, hash_hex = stored.split("$")
    except ValueError:
        return False

    if algorithm != _PBKDF2_ALGORITHM:
        return False

    try:
        iterations = int(iterations_text)
        salt = bytes.fromhex(salt_hex)
        expected = bytes.fromhex(hash_hex)
    except ValueError:
        return False

    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations
    )
    return hmac.compare_digest(derived, expected)


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def _sign(payload_segment: str, secret: str) -> str:
    signature = hmac.new(
        secret.encode("utf-8"), payload_segment.encode("ascii"), hashlib.sha256
    ).digest()
    return _b64url_encode(signature)


def create_token(
    user_id: int, email: str, secret: str, ttl_seconds: int, *, issued_at: int | None = None
) -> str:
    """Create a compact HMAC-signed session token: ``<payload>.<signature>``."""

    now = int(time.time()) if issued_at is None else issued_at
    payload = {"sub": user_id, "email": email, "iat": now, "exp": now + ttl_seconds}
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    return f"{payload_segment}.{_sign(payload_segment, secret)}"


def decode_token(token: str, secret: str, *, now: int | None = None) -> dict | None:
    """Return the token payload if the signature is valid and it is unexpired.

    Returns ``None`` for any malformed, tampered, or expired token so callers can
    treat "no valid session" uniformly.
    """

    try:
        payload_segment, signature = token.split(".")
    except (ValueError, AttributeError):
        return None

    expected_signature = _sign(payload_segment, secret)
    if not hmac.compare_digest(signature, expected_signature):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_segment))
    except (ValueError, json.JSONDecodeError):
        return None

    current = int(time.time()) if now is None else now
    if not isinstance(payload, dict) or "exp" not in payload:
        return None
    if current >= int(payload["exp"]):
        return None

    return payload
