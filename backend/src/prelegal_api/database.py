import sqlite3
from pathlib import Path
from typing import Protocol

try:
    import libsql_experimental as libsql
except ModuleNotFoundError:  # pragma: no cover - exercised only without local libSQL wheels
    libsql = None


class DatabaseConnection(Protocol):
    def execute(self, sql: str): ...
    def commit(self) -> None: ...
    def close(self) -> None: ...


USERS_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""


def _file_url_to_path(database_url: str) -> str:
    return database_url.removeprefix("file:")


def _ensure_parent_directory(database_url: str) -> None:
    if not database_url.startswith("file:"):
        return

    path_text = _file_url_to_path(database_url)
    if path_text == ":memory:":
        return

    database_path = Path(path_text)
    if database_path.parent and str(database_path.parent) not in ("", "."):
        database_path.parent.mkdir(parents=True, exist_ok=True)


def connect_database(database_url: str) -> DatabaseConnection:
    """Connect to libSQL, falling back to sqlite3 for local file URLs.

    Turso/libSQL is the intended database layer. The fallback keeps local tests
    runnable on Python versions/platforms where `libsql-experimental` has no
    prebuilt wheel and compiling the native extension is not available.
    """

    if libsql is not None:
        return libsql.connect(database_url)

    if database_url.startswith("file:"):
        return sqlite3.connect(_file_url_to_path(database_url))

    raise RuntimeError(
        "libsql-experimental is required for non-file database URLs. "
        "Install it or run through the Docker image."
    )


def init_database(database_url: str) -> None:
    """Initialize the local libSQL database schema.

    PL-4 needs the V1 foundation to include a `users` table while keeping the
    login screen cosmetic. The schema is idempotent and runs at application
    startup and in tests.
    """

    _ensure_parent_directory(database_url)
    connection = connect_database(database_url)
    try:
        connection.execute(USERS_SCHEMA)
        connection.commit()
    finally:
        connection.close()
