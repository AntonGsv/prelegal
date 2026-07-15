"""Vercel serverless entrypoint for the Prelegal FastAPI backend.

Vercel's Python runtime auto-detects a top-level ``index.py`` and serves the
module-level ``app`` (an ASGI application) that it exports. The application
package lives under ``src/`` (a uv src-layout), which is not on ``sys.path`` in
the serverless sandbox, so prepend it before importing.

Dependencies are installed from ``requirements.txt``; the local ``prelegal_api``
package itself is imported from ``src/`` (bundled by Vercel from the project root
directory), not pip-installed. Database schema init runs via the FastAPI
``lifespan`` hook on cold start, against the remote Turso database configured by
``PRELEGAL_DATABASE_URL`` + ``PRELEGAL_DATABASE_AUTH_TOKEN``.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from prelegal_api.main import app  # noqa: E402  (sys.path setup must run first)

__all__ = ["app"]
