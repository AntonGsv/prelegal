import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from prelegal_api import document_detect, llm_client, main
from prelegal_api.document_detect import (
    DetectRequest,
    render_detect_prompt,
    run_detect_turn,
)
from prelegal_api.main import app


class _FakeCompletionResponse:
    def __init__(self, content: str):
        message = SimpleNamespace(content=content)
        self.choices = [SimpleNamespace(message=message)]


def _fake_detect_json(reply, matched=None, suggested=None) -> str:
    return json.dumps(
        {"reply": reply, "matchedSlug": matched, "suggestedSlug": suggested}
    )


@pytest.fixture
def configured_key(monkeypatch):
    monkeypatch.setattr(
        main, "get_settings", lambda: SimpleNamespace(openrouter_api_key="test-key")
    )


def test_detect_prompt_lists_every_document():
    prompt = render_detect_prompt()
    assert "mutual-nda: Mutual Non-Disclosure Agreement" in prompt
    assert "dpa: Data Processing Agreement" in prompt
    assert "Never invent a slug" in prompt


def test_run_detect_turn_returns_a_match(monkeypatch):
    monkeypatch.setattr(
        llm_client,
        "completion",
        lambda **_: _FakeCompletionResponse(
            _fake_detect_json("Let's create your NDA", matched="mutual-nda")
        ),
    )
    result = run_detect_turn(
        DetectRequest(messages=[{"role": "user", "content": "I need an NDA"}]),
        api_key="test-key",
    )
    assert result.matched_slug == "mutual-nda"
    assert result.suggested_slug is None


def test_run_detect_turn_suggests_closest_for_unsupported(monkeypatch):
    monkeypatch.setattr(
        llm_client,
        "completion",
        lambda **_: _FakeCompletionResponse(
            _fake_detect_json(
                "We can't generate an employment contract, but a PSA is close.",
                matched=None,
                suggested="psa",
            )
        ),
    )
    result = run_detect_turn(
        DetectRequest(
            messages=[{"role": "user", "content": "an employment contract"}]
        ),
        api_key="test-key",
    )
    assert result.matched_slug is None
    assert result.suggested_slug == "psa"


def test_detect_endpoint_returns_result(monkeypatch, configured_key):
    monkeypatch.setattr(
        llm_client,
        "completion",
        lambda **_: _FakeCompletionResponse(
            _fake_detect_json("Great choice", matched="csa")
        ),
    )
    client = TestClient(app)
    response = client.post(
        "/api/documents/detect",
        json={"messages": [{"role": "user", "content": "a SaaS contract"}]},
    )
    assert response.status_code == 200
    assert response.json()["matchedSlug"] == "csa"


def test_detect_endpoint_rejects_empty_messages(configured_key):
    client = TestClient(app)
    response = client.post("/api/documents/detect", json={"messages": []})
    assert response.status_code == 422


def test_detect_endpoint_requires_api_key(monkeypatch):
    monkeypatch.setattr(
        main, "get_settings", lambda: SimpleNamespace(openrouter_api_key="")
    )
    client = TestClient(app)
    response = client.post(
        "/api/documents/detect",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 503
