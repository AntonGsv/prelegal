"""Loads the document registry — the single source of truth for the fields,
chat framing, and party roles of every supported legal document.

The same ``document-registry.json`` is shipped to the frontend (a byte-identical
copy under ``frontend/src/lib/``); a guard test keeps the two in sync. The
backend reads it to build per-document LLM extraction schemas and system
prompts; nothing here is document-specific in code.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel

REGISTRY_PATH = Path(__file__).with_name("document_registry.json")

FieldKind = Literal["text", "email", "date", "longtext"]


class PartyRole(BaseModel):
    key: str
    label: str


class FieldConfig(BaseModel):
    key: str
    label: str
    group: str
    kind: FieldKind
    required: bool = True
    min_length: Optional[int] = None
    prompt_hint: str


class DocumentConfig(BaseModel):
    slug: str
    catalog_filename: str
    name: str
    short_name: str
    description: str
    system_prompt_intro: str
    party_roles: list[PartyRole]
    fields: list[FieldConfig]

    model_config = {"populate_by_name": True}


def _from_raw(raw: dict) -> DocumentConfig:
    """Build a DocumentConfig from the camelCase JSON the frontend also uses."""

    return DocumentConfig(
        slug=raw["slug"],
        catalog_filename=raw["catalogFilename"],
        name=raw["name"],
        short_name=raw["shortName"],
        description=raw["description"],
        system_prompt_intro=raw["systemPromptIntro"],
        party_roles=[PartyRole(**role) for role in raw["partyRoles"]],
        fields=[
            FieldConfig(
                key=f["key"],
                label=f["label"],
                group=f["group"],
                kind=f["kind"],
                required=f.get("required", True),
                min_length=f.get("minLength"),
                prompt_hint=f["promptHint"],
            )
            for f in raw["fields"]
        ],
    )


def load_registry(path: Path = REGISTRY_PATH) -> dict[str, DocumentConfig]:
    """Load and validate the registry from disk. Fails fast on a bad registry
    (duplicate slugs or duplicate field keys) rather than 500-ing on first use.
    """

    raw_documents = json.loads(path.read_text(encoding="utf-8"))
    registry: dict[str, DocumentConfig] = {}
    for raw in raw_documents:
        config = _from_raw(raw)
        if config.slug in registry:
            raise ValueError(f"Duplicate document slug in registry: {config.slug}")
        field_keys = [f.key for f in config.fields]
        if len(field_keys) != len(set(field_keys)):
            raise ValueError(f"Duplicate field key in document: {config.slug}")
        registry[config.slug] = config
    return registry


@lru_cache
def get_registry() -> dict[str, DocumentConfig]:
    return load_registry()


def list_documents() -> list[DocumentConfig]:
    return list(get_registry().values())


def get_document(slug: str) -> Optional[DocumentConfig]:
    return get_registry().get(slug)
