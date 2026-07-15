import json
from pathlib import Path

import pytest

from prelegal_api.document_registry import (
    get_document,
    list_documents,
    load_registry,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_REGISTRY = REPO_ROOT / "backend/src/prelegal_api/document_registry.json"
FRONTEND_REGISTRY = REPO_ROOT / "frontend/src/lib/document-registry.json"
CATALOG = REPO_ROOT / "catalog.json"
TEMPLATES_DIR = REPO_ROOT / "templates"
FRONTEND_TEMPLATES_DIR = REPO_ROOT / "frontend/src/content/templates"


def test_registry_loads_all_documents():
    registry = load_registry()
    assert len(registry) == 11
    assert "mutual-nda" in registry


def test_every_document_has_the_shared_core_fields():
    for doc in list_documents():
        keys = {f.key for f in doc.fields}
        # Every document is a standalone 2-party contract with a cover page.
        assert {
            "partyA_companyName",
            "partyB_companyName",
            "effectiveDate",
            "governingLaw",
            "jurisdiction",
        } <= keys
        assert len(doc.party_roles) == 2


def test_mutual_nda_matches_the_original_field_set():
    doc = get_document("mutual-nda")
    assert doc is not None
    keys = [f.key for f in doc.fields]
    assert keys == [
        "partyA_companyName",
        "partyA_address",
        "partyA_representative",
        "partyA_email",
        "partyB_companyName",
        "partyB_address",
        "partyB_representative",
        "partyB_email",
        "effectiveDate",
        "ndaTerm",
        "confidentialityTerm",
        "purpose",
        "governingLaw",
        "jurisdiction",
    ]


def test_email_fields_use_the_email_kind():
    doc = get_document("mutual-nda")
    assert doc is not None
    by_key = {f.key: f for f in doc.fields}
    assert by_key["partyA_email"].kind == "email"
    assert by_key["purpose"].kind == "longtext"
    assert by_key["purpose"].min_length == 10


def test_registry_slugs_match_catalog_filenames():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    catalog_files = {t["filename"] for t in catalog["templates"]}
    registry_files = {doc.catalog_filename for doc in list_documents()}
    assert registry_files == catalog_files


def test_every_template_file_exists():
    for doc in list_documents():
        assert (TEMPLATES_DIR / doc.catalog_filename).exists()


def test_backend_and_frontend_registry_are_identical():
    """The frontend ships a byte-identical copy; guard against drift."""
    if not FRONTEND_REGISTRY.exists():
        pytest.skip("frontend registry copy not present (partial checkout)")
    assert (
        BACKEND_REGISTRY.read_text(encoding="utf-8")
        == FRONTEND_REGISTRY.read_text(encoding="utf-8")
    )


def test_frontend_template_bodies_mirror_root_templates():
    """The frontend renders PDFs client-side from a mirrored copy of the
    templates; guard the copies against drifting from the licensed originals."""
    if not FRONTEND_TEMPLATES_DIR.exists():
        pytest.skip("frontend template mirror not present (partial checkout)")
    for doc in list_documents():
        root = TEMPLATES_DIR / doc.catalog_filename
        mirror = FRONTEND_TEMPLATES_DIR / doc.catalog_filename
        assert mirror.exists(), f"missing frontend mirror for {doc.catalog_filename}"
        assert root.read_text(encoding="utf-8") == mirror.read_text(
            encoding="utf-8"
        ), f"frontend template mirror out of sync: {doc.catalog_filename}"
