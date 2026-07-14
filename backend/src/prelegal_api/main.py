from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .database import init_database
from .nda_chat import ChatRequest, ChatResponse, run_chat_turn
from .settings import get_settings


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


# Sync route: FastAPI runs it in a threadpool, so the blocking LLM call does
# not tie up the event loop.
@app.post("/api/nda/mutual/chat")
def nda_mutual_chat(request: ChatRequest) -> ChatResponse:
    if not request.messages:
        raise HTTPException(status_code=422, detail="messages must not be empty")

    api_key = get_settings().openrouter_api_key
    if not api_key:
        raise HTTPException(
            status_code=503, detail="AI chat is not configured (missing API key)"
        )

    try:
        return run_chat_turn(request, api_key)
    except Exception as exc:  # noqa: BLE001 - surface a clean 502 to the client
        raise HTTPException(
            status_code=502, detail="The AI service failed to respond"
        ) from exc
