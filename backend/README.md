# Prelegal API

FastAPI backend foundation for Prelegal.

## Development

```bash
uv sync
uv run uvicorn prelegal_api.main:app --reload --host 0.0.0.0 --port 8000
```

The API exposes:

- `GET /api/health` — service health check

On startup, the app initializes the local libSQL database and creates the `users` table if it does not exist. PL-4 keeps login cosmetic, so no auth endpoints are wired yet.
