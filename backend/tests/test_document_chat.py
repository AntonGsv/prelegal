import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from prelegal_api import document_chat, llm_client, main
from prelegal_api.document_chat import (
    ChatMessage,
    ChatRequest,
    render_system_prompt,
    run_chat_turn,
)
from prelegal_api.document_registry import get_document
from prelegal_api.main import app

NDA = get_document("mutual-nda")


class _FakeCompletionResponse:
    """Mimics the shape of a litellm completion response."""

    def __init__(self, content: str):
        message = SimpleNamespace(content=content)
        self.choices = [SimpleNamespace(message=message)]


def _fake_result_json(reply: str, **fields) -> str:
    return json.dumps({"reply": reply, "fields": fields})


@pytest.fixture
def configured_key(monkeypatch):
    monkeypatch.setattr(
        main, "get_settings", lambda: SimpleNamespace(openrouter_api_key="test-key")
    )


def test_render_system_prompt_includes_intro_fields_and_guidance():
    prompt = render_system_prompt(NDA)
    assert "Mutual Non-Disclosure Agreement" in prompt
    assert "- partyA_companyName:" in prompt
    assert "- jurisdiction:" in prompt
    # Grouped headers from party roles + generic groups.
    assert "Party A:" in prompt
    assert "Terms:" in prompt
    assert "Emails must be valid" in prompt


def test_system_prompt_uses_document_specific_party_labels():
    dpa = get_document("dpa")
    prompt = render_system_prompt(dpa)
    assert "Provider:" in prompt
    assert "Customer:" in prompt
    assert "Data Processing Agreement" in prompt


def test_run_chat_turn_forwards_prompt_and_parses(monkeypatch):
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return _FakeCompletionResponse(
            _fake_result_json("Nice to meet you!", partyA_companyName="Acme Inc")
        )

    monkeypatch.setattr(llm_client, "completion", fake_completion)

    request = ChatRequest(messages=[ChatMessage(role="user", content="Hi, I'm Acme")])
    result = run_chat_turn(NDA, request, api_key="test-key")

    assert captured["messages"][0]["role"] == "system"
    assert captured["messages"][1] == {"role": "user", "content": "Hi, I'm Acme"}
    assert captured["model"] == llm_client.MODEL
    assert captured["extra_body"] == llm_client.EXTRA_BODY
    assert captured["api_key"] == "test-key"

    assert result.reply == "Nice to meet you!"
    assert result.fields["partyA_companyName"] == "Acme Inc"
    # Fields not provided come back as null, and only registry fields appear.
    assert result.fields["partyB_email"] is None
    assert set(result.fields) == {f.key for f in NDA.fields}


def test_run_chat_turn_retries_transient_failure(monkeypatch):
    calls = {"n": 0}

    def flaky(**_):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("transient upstream error")
        return _FakeCompletionResponse(_fake_result_json("Recovered!"))

    monkeypatch.setattr(llm_client, "completion", flaky)

    result = run_chat_turn(
        NDA,
        ChatRequest(messages=[ChatMessage(role="user", content="hi")]),
        api_key="test-key",
    )

    assert result.reply == "Recovered!"
    assert calls["n"] == 2


def test_run_chat_turn_rejects_empty_content(monkeypatch):
    monkeypatch.setattr(
        llm_client, "completion", lambda **_: _FakeCompletionResponse("")
    )

    with pytest.raises(Exception):
        run_chat_turn(
            NDA,
            ChatRequest(messages=[ChatMessage(role="user", content="hi")]),
            api_key="test-key",
        )


def test_chat_endpoint_returns_reply_and_fields(monkeypatch, configured_key):
    monkeypatch.setattr(
        llm_client,
        "completion",
        lambda **_: _FakeCompletionResponse(
            _fake_result_json("What's the effective date?", partyA_companyName="Acme")
        ),
    )
    client = TestClient(app)

    response = client.post(
        "/api/documents/mutual-nda/chat",
        json={"messages": [{"role": "user", "content": "Let's start"}]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "What's the effective date?"
    assert body["fields"]["partyA_companyName"] == "Acme"
    assert body["fields"]["jurisdiction"] is None


def test_chat_endpoint_works_for_a_second_document(monkeypatch, configured_key):
    monkeypatch.setattr(
        llm_client,
        "completion",
        lambda **_: _FakeCompletionResponse(
            _fake_result_json("Got it", targetUptime="99.9%")
        ),
    )
    client = TestClient(app)

    response = client.post(
        "/api/documents/sla/chat",
        json={"messages": [{"role": "user", "content": "I need an SLA"}]},
    )

    assert response.status_code == 200
    assert response.json()["fields"]["targetUptime"] == "99.9%"


def test_chat_endpoint_rejects_unknown_slug(configured_key):
    client = TestClient(app)
    response = client.post(
        "/api/documents/not-a-real-doc/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 404


def test_chat_endpoint_rejects_empty_messages(configured_key):
    client = TestClient(app)
    response = client.post("/api/documents/mutual-nda/chat", json={"messages": []})
    assert response.status_code == 422


def test_chat_endpoint_requires_api_key(monkeypatch):
    monkeypatch.setattr(
        main, "get_settings", lambda: SimpleNamespace(openrouter_api_key="")
    )
    client = TestClient(app)
    response = client.post(
        "/api/documents/mutual-nda/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 503


def test_chat_endpoint_wraps_llm_errors(monkeypatch, configured_key):
    def boom(**_):
        raise RuntimeError("upstream down")

    monkeypatch.setattr(llm_client, "completion", boom)
    client = TestClient(app)
    response = client.post(
        "/api/documents/mutual-nda/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )
    assert response.status_code == 502
