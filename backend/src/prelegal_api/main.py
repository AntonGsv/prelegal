import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import init_database
from .document_chat import ChatRequest, ChatResponse, run_chat_turn
from .document_detect import DetectRequest, DetectResponse, run_detect_turn
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
