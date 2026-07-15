"""Per-user document history (PL-7).

A document is fully reconstructable from its ``slug`` plus the collected
``fields`` (the template body and config are derived from the slug), so that is
all we persist. Saving happens when the user generates their PDF; listing and
fetching power the "Your documents" history UI, where a saved record is
re-previewed and re-downloaded.
"""

from __future__ import annotations

import json
from typing import Optional

from pydantic import BaseModel, Field

from .database import (
    create_document,
    get_document_for_user,
    list_documents_for_user,
)
from .document_registry import DocumentConfig, get_document


class UnknownDocumentError(Exception):
    """Save/read referenced a slug that isn't in the registry (→ 400/404)."""


class SaveDocumentRequest(BaseModel):
    slug: str
    fields: dict[str, str]
    title: Optional[str] = None


class DocumentSummary(BaseModel):
    id: int
    slug: str
    name: str
    title: str
    created_at: Optional[str] = Field(default=None, alias="createdAt")

    model_config = {"populate_by_name": True}


class DocumentDetail(DocumentSummary):
    fields: dict[str, str]


def _derive_title(config: DocumentConfig, fields: dict[str, str]) -> str:
    """A human label for the history list, e.g. "Mutual NDA — Acme Inc".

    Uses the first party field that has a value (typically a company name) so the
    user can tell their saved documents apart at a glance.
    """

    for field in config.fields:
        if field.group.startswith("party:"):
            value = (fields.get(field.key) or "").strip()
            if value:
                return f"{config.short_name} — {value}"
    return config.short_name


def _summary_from_row(row: dict) -> DocumentSummary:
    config = get_document(row["slug"])
    name = config.name if config is not None else row["slug"]
    return DocumentSummary(
        id=row["id"],
        slug=row["slug"],
        name=name,
        title=row["title"],
        createdAt=row.get("created_at"),
    )


def _detail_from_row(row: dict) -> DocumentDetail:
    summary = _summary_from_row(row)
    try:
        fields = json.loads(row["fields_json"])
    except (ValueError, TypeError):  # pragma: no cover - stored JSON is always valid
        fields = {}
    return DocumentDetail(**summary.model_dump(by_alias=True), fields=fields)


def save_document(
    user_id: int, request: SaveDocumentRequest, database_url: str
) -> DocumentDetail:
    config = get_document(request.slug)
    if config is None:
        raise UnknownDocumentError(f"Unknown document type: {request.slug}")

    title = (request.title or "").strip() or _derive_title(config, request.fields)
    fields_json = json.dumps(request.fields)
    row = create_document(database_url, user_id, request.slug, title, fields_json)
    return _detail_from_row(row)


def list_history(user_id: int, database_url: str) -> list[DocumentSummary]:
    rows = list_documents_for_user(database_url, user_id)
    return [_summary_from_row(row) for row in rows]


def get_history_document(
    user_id: int, document_id: int, database_url: str
) -> Optional[DocumentDetail]:
    row = get_document_for_user(database_url, user_id, document_id)
    if row is None:
        return None
    return _detail_from_row(row)
