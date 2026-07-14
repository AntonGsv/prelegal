"""AI chat that collects Mutual NDA details through a freeform conversation.

The model re-extracts every field from the full conversation on each turn, so
the conversation history is the single source of truth (no server-side merge).
LiteLLM is imported lazily inside ``_completion`` so the module (and its tests,
which mock the call) can be imported without the native LiteLLM stack present.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

SYSTEM_PROMPT = """\
You are a friendly legal assistant helping a user create a Mutual \
Non-Disclosure Agreement (MNDA) between two parties. Instead of a form, you \
collect the required details through a natural, freeform conversation.

Your job each turn:
1. Write a short, warm `reply` that moves the conversation forward. Ask about \
the information you still need, a few related items at a time. Do not overwhelm \
the user with all questions at once. If the user asks a question, answer it \
briefly, then continue collecting.
2. Populate `fields` with everything you can determine from the ENTIRE \
conversation so far. Re-read the whole history every turn. Leave a field null \
until the user has actually provided it. Never invent or guess values.

The MNDA needs these fields (both parties are mutual disclosing parties, \
labelled Party A and Party B):
- partyA_companyName, partyA_address, partyA_representative, partyA_email
- partyB_companyName, partyB_address, partyB_representative, partyB_email
- effectiveDate: the date the agreement takes effect, normalized to \
YYYY-MM-DD.
- ndaTerm: how long the agreement lasts, e.g. "2 years".
- confidentialityTerm: how long confidentiality obligations survive, e.g. \
"3 years".
- purpose: a meaningful sentence (at least 10 characters) describing why the \
parties are sharing confidential information.
- governingLaw: the U.S. state whose law governs the agreement. Normalize to \
the full state name (e.g. "California", "New York", "Delaware", or "District \
of Columbia").
- jurisdiction: where legal disputes are handled, e.g. "state and federal \
courts in San Francisco County, California".

Guidance:
- Emails must be valid email addresses; if one looks wrong, ask again.
- If an answer is ambiguous, ask a clarifying question rather than guessing.
- Once every field is filled, summarize the collected details back to the user \
and ask them to confirm or make changes. Keep all fields populated while \
confirming.
"""


class ChatMessage(BaseModel):
    """A single turn in the conversation."""

    role: Literal["user", "assistant"]
    content: str


class NdaFields(BaseModel):
    """The Mutual NDA fields, each optional until gathered from the user."""

    partyA_companyName: Optional[str] = Field(
        default=None, description="Party A company/legal name"
    )
    partyA_address: Optional[str] = Field(
        default=None, description="Party A full mailing address"
    )
    partyA_representative: Optional[str] = Field(
        default=None, description="Name of the person signing for Party A"
    )
    partyA_email: Optional[str] = Field(
        default=None, description="Party A contact email address"
    )
    partyB_companyName: Optional[str] = Field(
        default=None, description="Party B company/legal name"
    )
    partyB_address: Optional[str] = Field(
        default=None, description="Party B full mailing address"
    )
    partyB_representative: Optional[str] = Field(
        default=None, description="Name of the person signing for Party B"
    )
    partyB_email: Optional[str] = Field(
        default=None, description="Party B contact email address"
    )
    effectiveDate: Optional[str] = Field(
        default=None, description="Effective date in YYYY-MM-DD format"
    )
    ndaTerm: Optional[str] = Field(
        default=None, description="Duration of the agreement, e.g. '2 years'"
    )
    confidentialityTerm: Optional[str] = Field(
        default=None,
        description="How long confidentiality survives, e.g. '3 years'",
    )
    purpose: Optional[str] = Field(
        default=None,
        description="Why confidential information is being shared (>= 10 chars)",
    )
    governingLaw: Optional[str] = Field(
        default=None, description="Full U.S. state name whose law governs"
    )
    jurisdiction: Optional[str] = Field(
        default=None, description="Courts/location where disputes are handled"
    )


class ChatRequest(BaseModel):
    """Incoming request: the full conversation so far."""

    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    """The assistant's next reply plus every field known so far.

    Doubles as the LiteLLM structured-output schema and the HTTP response body.
    """

    reply: str = Field(description="The assistant's next message to the user")
    fields: NdaFields = Field(
        default_factory=NdaFields,
        description="All NDA fields determined from the conversation so far",
    )


def _completion(**kwargs):
    """Thin wrapper around litellm.completion (imported lazily, mockable)."""

    from litellm import completion

    return completion(**kwargs)


def run_chat_turn(request: ChatRequest, api_key: str) -> ChatResponse:
    """Run one conversation turn and return the reply plus extracted fields."""

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in request.messages]

    response = _completion(
        model=MODEL,
        messages=messages,
        response_format=ChatResponse,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
        api_key=api_key or None,
    )
    content = response.choices[0].message.content
    return ChatResponse.model_validate_json(content)
