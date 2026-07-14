from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from prelegal_api import main, nda_chat
from prelegal_api.main import app
from prelegal_api.nda_chat import ChatMessage, ChatRequest, ChatResponse, run_chat_turn


class _FakeCompletionResponse:
    """Mimics the shape of a litellm completion response."""

    def __init__(self, content: str):
        message = SimpleNamespace(content=content)
        self.choices = [SimpleNamespace(message=message)]


def _fake_result_json(reply: str, **fields) -> str:
    return ChatResponse(reply=reply, fields=fields).model_dump_json()


@pytest.fixture
def configured_key(monkeypatch):
    monkeypatch.setattr(
        main, "get_settings", lambda: SimpleNamespace(openrouter_api_key="test-key")
    )


def test_run_chat_turn_forwards_prompt_and_parses(monkeypatch):
    captured = {}

    def fake_completion(**kwargs):
        captured.update(kwargs)
        return _FakeCompletionResponse(
            _fake_result_json("Nice to meet you!", partyA_companyName="Acme Inc")
        )

    monkeypatch.setattr(nda_chat, "_completion", fake_completion)

    request = ChatRequest(messages=[ChatMessage(role="user", content="Hi, I'm Acme")])
    result = run_chat_turn(request, api_key="test-key")

    # The system prompt is prepended, then the conversation is forwarded verbatim.
    assert captured["messages"][0]["role"] == "system"
    assert captured["messages"][1] == {"role": "user", "content": "Hi, I'm Acme"}
    assert captured["model"] == nda_chat.MODEL
    assert captured["extra_body"] == nda_chat.EXTRA_BODY
    assert captured["response_format"] is ChatResponse
    assert captured["api_key"] == "test-key"

    assert result.reply == "Nice to meet you!"
    assert result.fields.partyA_companyName == "Acme Inc"
    assert result.fields.partyB_email is None


def test_chat_endpoint_returns_reply_and_fields(monkeypatch, configured_key):
    monkeypatch.setattr(
        nda_chat,
        "_completion",
        lambda **_: _FakeCompletionResponse(
            _fake_result_json("What's the effective date?", partyA_companyName="Acme")
        ),
    )
    client = TestClient(app)

    response = client.post(
        "/api/nda/mutual/chat",
        json={"messages": [{"role": "user", "content": "Let's start"}]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "What's the effective date?"
    assert body["fields"]["partyA_companyName"] == "Acme"
    assert body["fields"]["jurisdiction"] is None


def test_chat_endpoint_rejects_empty_messages(configured_key):
    client = TestClient(app)

    response = client.post("/api/nda/mutual/chat", json={"messages": []})

    assert response.status_code == 422


def test_chat_endpoint_requires_api_key(monkeypatch):
    monkeypatch.setattr(
        main, "get_settings", lambda: SimpleNamespace(openrouter_api_key="")
    )
    client = TestClient(app)

    response = client.post(
        "/api/nda/mutual/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )

    assert response.status_code == 503


def test_chat_endpoint_wraps_llm_errors(monkeypatch, configured_key):
    def boom(**_):
        raise RuntimeError("upstream down")

    monkeypatch.setattr(nda_chat, "_completion", boom)
    client = TestClient(app)

    response = client.post(
        "/api/nda/mutual/chat",
        json={"messages": [{"role": "user", "content": "hi"}]},
    )

    assert response.status_code == 502
