import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import auth as auth_module
from . import document_history
from .auth import (
    AuthError,
    AuthResponse,
    EmailTakenError,
    InvalidCredentialsError,
    InvalidTokenError,
    LoginRequest,
    RegisterRequest,
    UserOut,
)
from .database import init_database
from .document_chat import ChatRequest, ChatResponse, run_chat_turn
from .document_detect import DetectRequest, DetectResponse, run_detect_turn
from .document_history import (
    DocumentDetail,
    DocumentSummary,
    SaveDocumentRequest,
    UnknownDocumentError,
)
from .document_registry import get_document
from .settings import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_database(settings.database_url)
    yield


app = FastAPI(
    title="Prelegal API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "prelegal-api"}


def _require_api_key() -> str:
    api_key = get_settings().openrouter_api_key
    if not api_key:
        raise HTTPException(
            status_code=503, detail="AI chat is not configured (missing API key)"
        )
    return api_key


def require_user(authorization: Optional[str] = Header(default=None)) -> UserOut:
    """FastAPI dependency: resolve the signed-in user from the Bearer token."""

    settings = get_settings()
    try:
        return auth_module.user_from_token(
            authorization, settings.database_url, settings.session_secret
        )
    except InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


# --- Auth routes -----------------------------------------------------------


@app.post("/api/auth/register", response_model=AuthResponse, status_code=201)
def register(request: RegisterRequest) -> AuthResponse:
    settings = get_settings()
    try:
        return auth_module.register(
            request,
            settings.database_url,
            settings.session_secret,
            settings.session_ttl_seconds,
        )
    except EmailTakenError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except AuthError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/auth/login", response_model=AuthResponse)
def login(request: LoginRequest) -> AuthResponse:
    settings = get_settings()
    try:
        return auth_module.authenticate(
            request,
            settings.database_url,
            settings.session_secret,
            settings.session_ttl_seconds,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.get("/api/auth/me", response_model=UserOut)
def me(user: UserOut = Depends(require_user)) -> UserOut:
    return user


# --- Document history routes ----------------------------------------------


@app.post("/api/documents/history", response_model=DocumentDetail, status_code=201)
def save_document(
    request: SaveDocumentRequest, user: UserOut = Depends(require_user)
) -> DocumentDetail:
    try:
        return document_history.save_document(
            user.id, request, get_settings().database_url
        )
    except UnknownDocumentError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/documents/history", response_model=list[DocumentSummary])
def list_history(user: UserOut = Depends(require_user)) -> list[DocumentSummary]:
    return document_history.list_history(user.id, get_settings().database_url)


@app.get("/api/documents/history/{document_id}", response_model=DocumentDetail)
def get_history_document(
    document_id: int, user: UserOut = Depends(require_user)
) -> DocumentDetail:
    document = document_history.get_history_document(
        user.id, document_id, get_settings().database_url
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


# Sync routes: FastAPI runs them in a threadpool, so the blocking LLM call does
# not tie up the event loop.
@app.post("/api/documents/{slug}/chat")
def document_chat(slug: str, request: ChatRequest) -> ChatResponse:
    config = get_document(slug)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Unknown document type: {slug}")
    if not request.messages:
        raise HTTPException(status_code=422, detail="messages must not be empty")

    api_key = _require_api_key()
    try:
        return run_chat_turn(config, request, api_key)
    except Exception as exc:  # noqa: BLE001 - surface a clean 502 to the client
        logger.exception("Document chat turn failed for %s", slug)
        raise HTTPException(
            status_code=502, detail="The AI service failed to respond"
        ) from exc


@app.post("/api/documents/detect")
def document_detect(request: DetectRequest) -> DetectResponse:
    if not request.messages:
        raise HTTPException(status_code=422, detail="messages must not be empty")

    api_key = _require_api_key()
    try:
        return run_detect_turn(request, api_key)
    except Exception as exc:  # noqa: BLE001 - surface a clean 502 to the client
        logger.exception("Document detection failed")
        raise HTTPException(
            status_code=502, detail="The AI service failed to respond"
        ) from exc


# Serve the exported frontend (single-project deploy). Mounted LAST so the
# `/api/*` routes above always take precedence over this catch-all. The static
# bundle is the Next.js `output: "export"` build copied into `backend/static` by
# the Vercel/Docker build. On Vercel all requests are rewritten to this function
# (see the root `vercel.json`); static assets that exist are served by the CDN
# first, and this mount serves the SPA HTML shell for the remaining routes.
STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "static"
if STATIC_DIR.is_dir():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
