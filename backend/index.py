"""Vercel serverless entrypoint for the Prelegal FastAPI backend (two-project deploy).

Vercel's Python runtime auto-detects a top-level ``index.py`` and serves the
module-level ``app`` (an ASGI application) that it exports; all requests to this
project are routed to the FastAPI app natively (its routes are under ``/api/*``).
The application package lives under ``src/`` (a uv src-layout), which is not on
``sys.path`` in the serverless sandbox, so prepend it before importing.

Dependencies install from ``requirements.txt`` (``.vercelignore`` hides the uv
manifests so Vercel uses a plain ``pip install``); the local ``prelegal_api``
package is imported from ``src/``, not pip-installed.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from prelegal_api.main import app  # noqa: E402  (sys.path setup must run first)

__all__ = ["app"]
