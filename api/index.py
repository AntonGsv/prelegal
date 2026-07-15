"""Vercel serverless entrypoint (single-project deploy, PL-8).

Exposes the FastAPI application as a module-level ASGI ``app`` that Vercel's
Python runtime serves. The root ``vercel.json`` rewrites every ``/api/*`` request
here (the function receives the original path, so FastAPI's own ``/api/...``
routes match); the static frontend export is served by Vercel's CDN.

The backend package lives under ``backend/src`` (uv src-layout) and is bundled
into the function via ``includeFiles: "backend/**"`` in ``vercel.json``. It is
not pip-installed, so put ``backend/src`` on ``sys.path`` before importing.
"""

import os
import sys

sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "backend", "src")
)

from prelegal_api.main import app  # noqa: E402  (sys.path setup must run first)

__all__ = ["app"]
