"""Shared LiteLLM client for the Prelegal AI features.

LiteLLM is imported lazily inside ``completion`` so the module (and the tests
that mock it) can be imported without the native LiteLLM stack present. All AI
features (document chat, document-type detection) route through
``run_structured_turn`` here, so the model, provider pin, structured-output
call, and the retry/timeout policy live in exactly one place.
"""

import logging
from typing import TypeVar

from pydantic import BaseModel

logger = logging.getLogger(__name__)

MODEL = "openrouter/openai/gpt-oss-120b"

# Pin inference to Cerebras via OpenRouter (see the Cerebras skill / CLAUDE.md).
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

# The upstream LLM call can fail transiently (provider hiccup, rate limit, a
# malformed structured-output payload). ``num_retries`` lets LiteLLM retry API
# errors; callers additionally wrap this in an outer loop covering empty or
# unparseable responses.
REQUEST_TIMEOUT_SECONDS = 30
LITELLM_NUM_RETRIES = 2
MAX_ATTEMPTS = 2


def completion(**kwargs):
    """Thin wrapper around ``litellm.completion`` (imported lazily, mockable)."""

    from litellm import completion as litellm_completion

    return litellm_completion(**kwargs)


T = TypeVar("T", bound=BaseModel)


def run_structured_turn(
    messages: list[dict],
    response_model: type[T],
    api_key: str,
    *,
    label: str = "structured turn",
) -> T:
    """Run one structured-output LLM turn and return the validated model.

    Retries transient upstream failures and empty/unparseable responses before
    giving up, so a single provider hiccup doesn't surface as an error to the
    user. Callers build ``messages``/``response_model`` and map the result.
    """

    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = completion(
                model=MODEL,
                messages=messages,
                response_format=response_model,
                reasoning_effort="low",
                extra_body=EXTRA_BODY,
                api_key=api_key or None,
                num_retries=LITELLM_NUM_RETRIES,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            content = response.choices[0].message.content
            if not content:
                raise ValueError("LLM returned an empty response")
            return response_model.model_validate_json(content)
        except Exception as exc:  # noqa: BLE001 - retried, then re-raised below
            last_error = exc
            logger.warning(
                "%s attempt %d/%d failed: %s", label, attempt, MAX_ATTEMPTS, exc
            )

    assert last_error is not None  # loop runs at least once
    raise last_error
