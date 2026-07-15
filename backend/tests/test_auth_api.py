"""End-to-end tests for the PL-7 auth endpoints via the FastAPI TestClient."""

from fastapi.testclient import TestClient


def register(client: TestClient, email="founder@example.com", password="hunter2pass"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "displayName": "Founder"},
    )


def test_register_returns_token_and_user(client: TestClient):
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert body["token"]
    assert body["user"]["email"] == "founder@example.com"
    assert body["user"]["displayName"] == "Founder"
    assert "id" in body["user"]


def test_register_normalizes_email(client: TestClient):
    response = register(client, email="  Founder@Example.COM  ")

    assert response.status_code == 201
    assert response.json()["user"]["email"] == "founder@example.com"


def test_register_rejects_short_password(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={"email": "a@b.com", "password": "short"},
    )
    assert response.status_code == 422


def test_register_rejects_invalid_email(client: TestClient):
    response = client.post(
        "/api/auth/register",
        json={"email": "not-an-email", "password": "longenough1"},
    )
    assert response.status_code == 422


def test_register_rejects_duplicate_email(client: TestClient):
    assert register(client).status_code == 201

    duplicate = register(client)
    assert duplicate.status_code == 409


def test_login_succeeds_with_correct_password(client: TestClient):
    register(client)

    response = client.post(
        "/api/auth/login",
        json={"email": "founder@example.com", "password": "hunter2pass"},
    )
    assert response.status_code == 200
    assert response.json()["token"]


def test_login_is_case_insensitive_on_email(client: TestClient):
    register(client)

    response = client.post(
        "/api/auth/login",
        json={"email": "FOUNDER@example.com", "password": "hunter2pass"},
    )
    assert response.status_code == 200


def test_login_rejects_wrong_password(client: TestClient):
    register(client)

    response = client.post(
        "/api/auth/login",
        json={"email": "founder@example.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_login_rejects_unknown_email(client: TestClient):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "whatever12"},
    )
    assert response.status_code == 401


def test_me_returns_current_user_with_token(client: TestClient):
    token = register(client).json()["token"]

    response = client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "founder@example.com"


def test_me_rejects_missing_token(client: TestClient):
    assert client.get("/api/auth/me").status_code == 401


def test_me_rejects_invalid_token(client: TestClient):
    response = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not.a.token"}
    )
    assert response.status_code == 401
