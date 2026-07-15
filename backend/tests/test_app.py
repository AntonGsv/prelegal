from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from prelegal_api import database
from prelegal_api.database import connect_database, init_database
from prelegal_api.main import app

# The pre-PL-7 `users` table, before the `password_hash` column existed. Used to
# reproduce the persistent-Docker-volume case where the DB predates PL-7.
LEGACY_USERS_SCHEMA = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""


def _create_legacy_database(database_url: str, *, seed_email: str | None = None) -> None:
    connection = connect_database(database_url)
    try:
        connection.execute(LEGACY_USERS_SCHEMA)
        if seed_email is not None:
            connection.execute(
                "INSERT INTO users (email) VALUES (?)", (seed_email,)
            )
        connection.commit()
    finally:
        connection.close()


def test_health_endpoint_reports_ok():
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "prelegal-api"}


def test_init_database_creates_users_table(tmp_path: Path):
    database_path = tmp_path / "prelegal.db"
    database_url = f"file:{database_path}"

    init_database(database_url)

    connection = connect_database(database_url)
    try:
        rows = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
        ).fetchall()
    finally:
        connection.close()

    assert rows == [("users",)]


def test_init_database_creates_documents_table(tmp_path: Path):
    database_path = tmp_path / "prelegal.db"
    database_url = f"file:{database_path}"

    init_database(database_url)

    connection = connect_database(database_url)
    try:
        rows = connection.execute(
            "SELECT name FROM sqlite_master "
            "WHERE type = 'table' AND name = 'documents'"
        ).fetchall()
    finally:
        connection.close()

    assert rows == [("documents",)]


def test_users_table_has_password_hash_column(tmp_path: Path):
    database_path = tmp_path / "prelegal.db"
    database_url = f"file:{database_path}"

    init_database(database_url)

    connection = connect_database(database_url)
    try:
        columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
    finally:
        connection.close()

    assert "password_hash" in columns


def test_init_database_migrates_legacy_users_table(tmp_path: Path):
    # A database created before PL-7 has a `users` table without password_hash
    # (and no `documents` table). init_database must patch it in place.
    database_path = tmp_path / "legacy.db"
    database_url = f"file:{database_path}"
    _create_legacy_database(database_url, seed_email="legacy@example.com")

    init_database(database_url)

    connection = connect_database(database_url)
    try:
        user_columns = {
            row[1]
            for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        # The existing row is preserved, not wiped.
        (count,) = connection.execute("SELECT COUNT(*) FROM users").fetchone()
    finally:
        connection.close()

    assert "password_hash" in user_columns
    assert "documents" in tables
    assert count == 1


def test_init_database_migration_is_idempotent(tmp_path: Path):
    database_path = tmp_path / "legacy.db"
    database_url = f"file:{database_path}"
    _create_legacy_database(database_url)

    # Running twice must not error (e.g. "duplicate column name").
    init_database(database_url)
    init_database(database_url)

    connection = connect_database(database_url)
    try:
        columns = [
            row[1]
            for row in connection.execute("PRAGMA table_info(users)").fetchall()
        ]
    finally:
        connection.close()

    assert columns.count("password_hash") == 1


class _RecordingLibsql:
    """Stand-in for the `libsql_experimental` module that records connect args.

    The native wheel is unavailable on some dev platforms, so the remote
    (Turso) code path is exercised by patching `database.libsql`.
    """

    def __init__(self) -> None:
        self.calls: list[tuple[tuple, dict]] = []

    def connect(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return object()


def test_connect_passes_auth_token_for_remote_url(monkeypatch: pytest.MonkeyPatch):
    fake = _RecordingLibsql()
    monkeypatch.setattr(database, "libsql", fake)
    monkeypatch.setenv("PRELEGAL_DATABASE_AUTH_TOKEN", "turso-token")

    connect_database("libsql://example.turso.io")

    (args, kwargs) = fake.calls[0]
    assert args == ("libsql://example.turso.io",)
    assert kwargs == {"auth_token": "turso-token"}


def test_connect_reads_db_token_fallback_for_remote_url(
    monkeypatch: pytest.MonkeyPatch,
):
    fake = _RecordingLibsql()
    monkeypatch.setattr(database, "libsql", fake)
    monkeypatch.delenv("PRELEGAL_DATABASE_AUTH_TOKEN", raising=False)
    monkeypatch.setenv("DB_TOKEN", "legacy-named-token")

    connect_database("libsql://example.turso.io")

    assert fake.calls[0][1] == {"auth_token": "legacy-named-token"}


def test_connect_explicit_token_overrides_env(monkeypatch: pytest.MonkeyPatch):
    fake = _RecordingLibsql()
    monkeypatch.setattr(database, "libsql", fake)
    monkeypatch.setenv("PRELEGAL_DATABASE_AUTH_TOKEN", "env-token")

    connect_database("libsql://example.turso.io", auth_token="explicit-token")

    assert fake.calls[0][1] == {"auth_token": "explicit-token"}


def test_connect_omits_auth_token_for_file_url(monkeypatch: pytest.MonkeyPatch):
    # A local file: URL must open without a token even when one is in the
    # environment, preserving the embedded/local connection behavior.
    fake = _RecordingLibsql()
    monkeypatch.setattr(database, "libsql", fake)
    monkeypatch.setenv("PRELEGAL_DATABASE_AUTH_TOKEN", "turso-token")

    connect_database("file:./data/prelegal.db")

    assert fake.calls[0] == (("file:./data/prelegal.db",), {})


def test_register_works_against_a_migrated_legacy_database(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    database_path = tmp_path / "legacy.db"
    database_url = f"file:{database_path}"
    _create_legacy_database(database_url, seed_email="legacy@example.com")

    monkeypatch.setenv("PRELEGAL_DATABASE_URL", database_url)
    monkeypatch.setenv("PRELEGAL_SESSION_SECRET", "test-secret")

    from prelegal_api.settings import get_settings

    get_settings.cache_clear()
    try:
        with TestClient(app) as client:
            # A brand-new registration succeeds (this used to 500 with
            # "no such column: password_hash").
            created = client.post(
                "/api/auth/register",
                json={"email": "new@example.com", "password": "hunter2pass"},
            )
            assert created.status_code == 201

            # A legacy row (NULL password_hash) fails auth cleanly, never 500.
            legacy_login = client.post(
                "/api/auth/login",
                json={"email": "legacy@example.com", "password": "anything123"},
            )
            assert legacy_login.status_code == 401
    finally:
        get_settings.cache_clear()
