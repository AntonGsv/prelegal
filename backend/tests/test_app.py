from pathlib import Path

from fastapi.testclient import TestClient

from prelegal_api.database import connect_database, init_database
from prelegal_api.main import app


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
