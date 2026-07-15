"""Tests for the PL-7 per-user document-history endpoints."""

from fastapi.testclient import TestClient


def auth_headers(client: TestClient, email="user@example.com") -> dict[str, str]:
    token = client.post(
        "/api/auth/register",
        json={"email": email, "password": "hunter2pass"},
    ).json()["token"]
    return {"Authorization": f"Bearer {token}"}


NDA_FIELDS = {
    "partyA_companyName": "Acme Inc",
    "partyB_companyName": "Globex LLC",
    "purpose": "Evaluate a partnership",
}


def test_save_document_returns_detail(client: TestClient):
    headers = auth_headers(client)

    response = client.post(
        "/api/documents/history",
        json={"slug": "mutual-nda", "fields": NDA_FIELDS},
        headers=headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "mutual-nda"
    assert body["name"] == "Mutual Non-Disclosure Agreement"
    assert body["fields"] == NDA_FIELDS
    # Title is derived from the first party value when none is supplied.
    assert "Acme Inc" in body["title"]
    assert "createdAt" in body


def test_save_document_honors_explicit_title(client: TestClient):
    headers = auth_headers(client)

    response = client.post(
        "/api/documents/history",
        json={"slug": "mutual-nda", "fields": NDA_FIELDS, "title": "My NDA"},
        headers=headers,
    )
    assert response.json()["title"] == "My NDA"


def test_save_document_rejects_unknown_slug(client: TestClient):
    headers = auth_headers(client)

    response = client.post(
        "/api/documents/history",
        json={"slug": "not-a-real-doc", "fields": {}},
        headers=headers,
    )
    assert response.status_code == 400


def test_save_document_requires_auth(client: TestClient):
    response = client.post(
        "/api/documents/history",
        json={"slug": "mutual-nda", "fields": NDA_FIELDS},
    )
    assert response.status_code == 401


def test_list_documents_returns_saved_documents_newest_first(client: TestClient):
    headers = auth_headers(client)
    client.post(
        "/api/documents/history",
        json={"slug": "mutual-nda", "fields": NDA_FIELDS, "title": "First"},
        headers=headers,
    )
    client.post(
        "/api/documents/history",
        json={"slug": "mutual-nda", "fields": NDA_FIELDS, "title": "Second"},
        headers=headers,
    )

    response = client.get("/api/documents/history", headers=headers)
    assert response.status_code == 200
    titles = [doc["title"] for doc in response.json()]
    assert titles == ["Second", "First"]
    # Summaries do not carry the full field payload.
    assert "fields" not in response.json()[0]


def test_get_document_returns_full_fields(client: TestClient):
    headers = auth_headers(client)
    saved = client.post(
        "/api/documents/history",
        json={"slug": "mutual-nda", "fields": NDA_FIELDS},
        headers=headers,
    ).json()

    response = client.get(
        f"/api/documents/history/{saved['id']}", headers=headers
    )
    assert response.status_code == 200
    assert response.json()["fields"] == NDA_FIELDS


def test_documents_are_isolated_per_user(client: TestClient):
    alice = auth_headers(client, email="alice@example.com")
    bob = auth_headers(client, email="bob@example.com")

    saved = client.post(
        "/api/documents/history",
        json={"slug": "mutual-nda", "fields": NDA_FIELDS},
        headers=alice,
    ).json()

    # Bob cannot list Alice's documents...
    assert client.get("/api/documents/history", headers=bob).json() == []
    # ...nor fetch one by id.
    assert (
        client.get(
            f"/api/documents/history/{saved['id']}", headers=bob
        ).status_code
        == 404
    )


def test_get_missing_document_returns_404(client: TestClient):
    headers = auth_headers(client)
    assert client.get("/api/documents/history/999", headers=headers).status_code == 404
