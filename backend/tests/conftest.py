"""Shared pytest fixtures for the PL-7 auth + history endpoints.

Each test gets an isolated on-disk database and a deterministic session secret by
setting the `PRELEGAL_*` env vars and clearing the cached `Settings` singleton,
then driving the app through a `TestClient` (whose lifespan runs schema init).
"""

from pathlib import Path
from typing import Iterator

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    database_path = tmp_path / "prelegal-test.db"
    monkeypatch.setenv("PRELEGAL_DATABASE_URL", f"file:{database_path}")
    monkeypatch.setenv("PRELEGAL_SESSION_SECRET", "test-secret")

    from prelegal_api.settings import get_settings

    get_settings.cache_clear()

    from prelegal_api.main import app

    with TestClient(app) as test_client:
        yield test_client

    get_settings.cache_clear()
