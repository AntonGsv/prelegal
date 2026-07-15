"""Freeform document-type detection for the dashboard's "describe what you
need" entry point.

Given a short conversation where the user describes the document they want, the
model either matches it to a supported document type, or — if we don't support
it — explains that and offers the closest supported document. The catalog of
supported types is built from the registry, so it stays in sync automatically.
"""

from functools import lru_cache
from typing import Literal, Optional

from pydantic import BaseModel, Field, create_model

from . import llm_client
from .document_chat import ChatMessage
from .document_registry import list_documents

_DETECT_INSTRUCTIONS = """\
The user is describing a legal document they want to create. Decide which of \
the supported document types below best fits their request.

Respond with:
- `reply`: a short, friendly message to the user.
- `matchedSlug`: the slug of the supported document that matches their request, \
or null if none clearly matches.
- `suggestedSlug`: when nothing matches, the slug of the closest supported \
document you can offer instead (or null if truly nothing is related).

Rules:
- If the request clearly matches a supported type, set `matchedSlug` to that \
slug and confirm briefly in `reply` (e.g. "Great — let's create your ...").
- If we do NOT support the requested document, set `matchedSlug` to null, set \
`suggestedSlug` to the closest supported document, and in `reply` explain we \
can't generate that exact document but offer the closest one we can.
- If the request is too vague to tell, set both to null and ask a short \
clarifying question in `reply`.
- Only ever use a slug from the supported list below. Never invent a slug."""


class DetectRequest(BaseModel):
    messages: list[ChatMessage]


class DetectResponse(BaseModel):
    reply: str = Field(description="A friendly message to the user")
    matched_slug: Optional[str] = Field(default=None, alias="matchedSlug")
    suggested_slug: Optional[str] = Field(default=None, alias="suggestedSlug")

    model_config = {"populate_by_name": True}


def render_detect_prompt() -> str:
    catalog = "\n".join(
        f"- {doc.slug}: {doc.name} — {doc.description}" for doc in list_documents()
    )
    return f"{_DETECT_INSTRUCTIONS}\n\nSupported document types:\n{catalog}\n"


@lru_cache(maxsize=None)
def _detect_response_model() -> type[BaseModel]:
    """Constrain the slug fields to the known slugs so the model can't
    hallucinate an unsupported value."""

    slugs = tuple(doc.slug for doc in list_documents())
    slug_type = Optional[Literal[slugs]]  # type: ignore[valid-type]
    return create_model(
        "DetectResult",
        reply=(str, Field(description="A friendly message to the user")),
        matchedSlug=(slug_type, Field(default=None)),
        suggestedSlug=(slug_type, Field(default=None)),
    )


def run_detect_turn(request: DetectRequest, api_key: str) -> DetectResponse:
    """Run one detection turn and return the reply plus matched/suggested slug."""

    response_model = _detect_response_model()
    messages = [{"role": "system", "content": render_detect_prompt()}]
    messages += [{"role": m.role, "content": m.content} for m in request.messages]

    parsed = llm_client.run_structured_turn(
        messages, response_model, api_key, label="document detect"
    )
    return DetectResponse(
        reply=parsed.reply,
        matchedSlug=parsed.matchedSlug,
        suggestedSlug=parsed.suggestedSlug,
    )
