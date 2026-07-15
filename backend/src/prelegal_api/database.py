import sqlite3
from pathlib import Path
from typing import Any, Protocol

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
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""

# PL-7 stores each generated document so a signed-in user can revisit it. Only
# the slug + collected fields are needed to fully reconstruct the preview and
# regenerate a byte-identical PDF (the template body and config are derived from
# the slug), so `fields_json` is the entire per-instance payload.
DOCUMENTS_SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    fields_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
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

    The V1 foundation needs a `users` table (PL-4) and, since PL-7, a
    `documents` table for per-user history. The schema is idempotent and runs at
    application startup and in tests.

    `CREATE TABLE IF NOT EXISTS` does not alter an existing table, so a database
    created before PL-7 (e.g. the persistent Docker volume) keeps the old
    `users` shape with no `password_hash` column. `_migrate_add_column` patches
    that in place so registration/login work without wiping existing data.
    """

    _ensure_parent_directory(database_url)
    connection = connect_database(database_url)
    try:
        connection.execute(USERS_SCHEMA)
        connection.execute(DOCUMENTS_SCHEMA)
        # Added as a nullable column: SQLite cannot add a NOT NULL column to a
        # table that already has rows without a default. New rows always supply a
        # hash via `create_user`; any pre-PL-7 rows simply can't authenticate.
        _migrate_add_column(connection, "users", "password_hash", "TEXT")
        connection.commit()
    finally:
        connection.close()


def _table_columns(connection: DatabaseConnection, table: str) -> set[str]:
    # `table` is always an internal literal, never user input; PRAGMA does not
    # accept bound parameters for the table name.
    rows = connection.execute(f"PRAGMA table_info({table})").fetchall()
    return {row[1] for row in rows}


def _migrate_add_column(
    connection: DatabaseConnection, table: str, column: str, definition: str
) -> None:
    """Add `column` to `table` if it does not already exist (idempotent)."""

    if column not in _table_columns(connection, table):
        connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


# --- Query helpers ---------------------------------------------------------
#
# These open a fresh connection per call (mirroring `init_database`) and use `?`
# placeholders, which both `libsql_experimental` and the `sqlite3` fallback
# support. Rows are read positionally and mapped to plain dicts so callers never
# depend on which driver is active.


def _connect(database_url: str) -> DatabaseConnection:
    _ensure_parent_directory(database_url)
    return connect_database(database_url)


def create_user(
    database_url: str, email: str, display_name: str | None, password_hash: str
) -> dict[str, Any]:
    """Insert a user and return the stored row. Raises on a duplicate email."""

    connection = _connect(database_url)
    try:
        connection.execute(
            "INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)",
            (email, display_name, password_hash),
        )
        connection.commit()
    finally:
        connection.close()

    user = get_user_by_email(database_url, email)
    if user is None:  # pragma: no cover - insert then immediate read should always find it
        raise RuntimeError("User row vanished immediately after insert")
    return user


def get_user_by_email(database_url: str, email: str) -> dict[str, Any] | None:
    connection = _connect(database_url)
    try:
        row = connection.execute(
            "SELECT id, email, display_name, password_hash FROM users WHERE email = ?",
            (email,),
        ).fetchone()
    finally:
        connection.close()
    return _user_row(row)


def get_user_by_id(database_url: str, user_id: int) -> dict[str, Any] | None:
    connection = _connect(database_url)
    try:
        row = connection.execute(
            "SELECT id, email, display_name, password_hash FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    finally:
        connection.close()
    return _user_row(row)


def create_document(
    database_url: str, user_id: int, slug: str, title: str, fields_json: str
) -> dict[str, Any]:
    connection = _connect(database_url)
    try:
        cursor = connection.execute(
            "INSERT INTO documents (user_id, slug, title, fields_json) "
            "VALUES (?, ?, ?, ?)",
            (user_id, slug, title, fields_json),
        )
        new_id = getattr(cursor, "lastrowid", None)
        connection.commit()
        if new_id is None:  # pragma: no cover - libSQL cursors expose lastrowid
            new_id = connection.execute(
                "SELECT last_insert_rowid()"
            ).fetchone()[0]
    finally:
        connection.close()

    document = get_document_for_user(database_url, user_id, int(new_id))
    if document is None:  # pragma: no cover - insert then read should always find it
        raise RuntimeError("Document row vanished immediately after insert")
    return document


def list_documents_for_user(database_url: str, user_id: int) -> list[dict[str, Any]]:
    connection = _connect(database_url)
    try:
        rows = connection.execute(
            "SELECT id, user_id, slug, title, fields_json, created_at "
            "FROM documents WHERE user_id = ? ORDER BY id DESC",
            (user_id,),
        ).fetchall()
    finally:
        connection.close()
    return [_document_row(row) for row in rows]


def get_document_for_user(
    database_url: str, user_id: int, document_id: int
) -> dict[str, Any] | None:
    connection = _connect(database_url)
    try:
        row = connection.execute(
            "SELECT id, user_id, slug, title, fields_json, created_at "
            "FROM documents WHERE id = ? AND user_id = ?",
            (document_id, user_id),
        ).fetchone()
    finally:
        connection.close()
    return _document_row(row)


def _user_row(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row[0],
        "email": row[1],
        "display_name": row[2],
        "password_hash": row[3],
    }


def _document_row(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None
    return {
        "id": row[0],
        "user_id": row[1],
        "slug": row[2],
        "title": row[3],
        "fields_json": row[4],
        "created_at": row[5],
    }
