"""AI chat that collects a legal document's details through a freeform
conversation, generalized across every document type in the registry.

The model re-extracts every field from the full conversation on each turn, so
the conversation history is the single source of truth (no server-side merge).
The extraction schema and system prompt are built dynamically per document from
``document_registry.json`` — adding a document type means editing the registry,
not this file.
"""

from functools import lru_cache
from typing import Optional

from pydantic import BaseModel, Field, create_model

from . import llm_client
from .document_registry import DocumentConfig

# Generic per-turn instructions and guidance, shared by every document type.
_TURN_INSTRUCTIONS = """\
Your job each turn:
1. Write a short, warm `reply` that moves the conversation forward. Ask about \
the information you still need, a few related items at a time. Do not overwhelm \
the user with all questions at once. If the user asks a question, answer it \
briefly, then continue collecting.
2. Populate `fields` with everything you can determine from the ENTIRE \
conversation so far. Re-read the whole history every turn. Leave a field null \
until the user has actually provided it. Never invent or guess values."""

_GUIDANCE = """\
Guidance:
- Emails must be valid email addresses; if one looks wrong, ask again.
- Normalize any effective date to YYYY-MM-DD, and any U.S. state name to its \
full form (e.g. "California", "New York", "Delaware", "District of Columbia").
- If an answer is ambiguous, ask a clarifying question rather than guessing.
- For free-text fields, a short sentence or two is fine; capture the user's \
intent faithfully.
- Once every field is filled, summarize the collected details back to the user \
and ask them to confirm or make changes. Keep all fields populated while \
confirming."""

_GROUP_HEADERS = {"terms": "Terms", "legal": "Legal"}


class ChatMessage(BaseModel):
    """A single turn in the conversation."""

    role: str
    content: str


class ChatRequest(BaseModel):
    """Incoming request: the full conversation so far."""

    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    """The assistant's next reply plus every field known so far.

    The wire contract is intentionally generic: ``fields`` is a flat mapping so
    the HTTP shape is identical for every document type. The per-document typed
    model is used only internally to give LiteLLM an accurate structured-output
    schema.
    """

    reply: str = Field(description="The assistant's next message to the user")
    fields: dict[str, Optional[str]] = Field(default_factory=dict)


def _group_header(group: str, roles: dict[str, str]) -> Optional[str]:
    if group.startswith("party:"):
        return roles.get(group.split(":", 1)[1], "Party")
    return _GROUP_HEADERS.get(group)


def render_system_prompt(config: DocumentConfig) -> str:
    """Build the system prompt for a document from its registry entry."""

    roles = {role.key: role.label for role in config.party_roles}
    lines: list[str] = []
    current_group: Optional[str] = None
    for field in config.fields:
        if field.group != current_group:
            current_group = field.group
            header = _group_header(field.group, roles)
            if header:
                lines.append(f"\n{header}:")
        lines.append(f"- {field.key}: {field.prompt_hint}")
    field_list = "\n".join(lines).lstrip("\n")

    return (
        f"{config.system_prompt_intro}\n\n"
        f"{_TURN_INSTRUCTIONS}\n\n"
        f"The {config.name} needs these fields:\n{field_list}\n\n"
        f"{_GUIDANCE}\n"
    )


@lru_cache(maxsize=None)
def _fields_model_for(slug: str) -> type[BaseModel]:
    """Build (and cache) the per-document Pydantic model used as the LLM's
    structured-output schema. Cached per slug so ``create_model`` runs once."""

    from .document_registry import get_document

    config = get_document(slug)
    if config is None:  # pragma: no cover - callers validate the slug first
        raise ValueError(f"Unknown document slug: {slug}")

    field_defs = {
        field.key: (Optional[str], Field(default=None, description=field.prompt_hint))
        for field in config.fields
    }
    return create_model(f"{_pascal(slug)}Fields", **field_defs)


@lru_cache(maxsize=None)
def _response_model_for(slug: str) -> type[BaseModel]:
    fields_model = _fields_model_for(slug)
    return create_model(
        f"{_pascal(slug)}ChatResponse",
        reply=(str, Field(description="The assistant's next message to the user")),
        fields=(fields_model, Field(default_factory=fields_model)),
    )


def _pascal(slug: str) -> str:
    return "".join(part.capitalize() for part in slug.replace("_", "-").split("-"))


def run_chat_turn(
    config: DocumentConfig, request: ChatRequest, api_key: str
) -> ChatResponse:
    """Run one conversation turn and return the reply plus extracted fields."""

    response_model = _response_model_for(config.slug)
    messages = [{"role": "system", "content": render_system_prompt(config)}]
    messages += [{"role": m.role, "content": m.content} for m in request.messages]

    parsed = llm_client.run_structured_turn(
        messages, response_model, api_key, label=f"document chat[{config.slug}]"
    )
    return ChatResponse(reply=parsed.reply, fields=parsed.fields.model_dump())
