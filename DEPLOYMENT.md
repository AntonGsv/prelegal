# Deploying Prelegal to Vercel (PL-8)

Prelegal deploys as **two Vercel projects from this one repo**, each native to
its framework (this avoids the routing problems of trying to serve a static
frontend and a Python function from a single project):

| Project  | Root Directory | Framework | Serves |
| -------- | -------------- | --------- | ------ |
| Backend  | `backend`      | FastAPI (Python) | the `/api/*` JSON API |
| Frontend | `frontend`     | Next.js          | the web app (browser) |

The browser calls the backend **cross-origin**: the frontend build bakes in the
backend's URL (`NEXT_PUBLIC_API_URL`) and the backend allows the frontend's
origin via CORS (`PRELEGAL_CORS_ORIGINS`). Auth is a stateless Bearer token in
`localStorage`, so there are no cookie/same-site concerns. The database is a
hosted **Turso** libSQL database (a serverless filesystem is ephemeral, so a
local SQLite file would not persist).

## 1. Provision Turso

```bash
turso db create prelegal
turso db show prelegal --url        # -> libsql://<db>.turso.io
turso db tokens create prelegal     # -> the auth token
```

Schema is created automatically on the first request (idempotent
`CREATE TABLE IF NOT EXISTS` in the FastAPI `lifespan` hook on cold start).

## 2. Backend project (Root Directory = `backend`)

Vercel detects FastAPI and serves the `app` exported by `backend/index.py` (a
thin ASGI shim that puts `src/` on the path); all requests reach the app
natively, so its `/api/*` routes just work. Deps install from
`backend/requirements.txt` (`backend/.vercelignore` hides the uv manifests so
Vercel uses a plain `pip install`). **`backend/vercel.json` sets
`build.env.UV_PYTHON = 3.12`** — this is required: Vercel's uv builder otherwise
defaults to Python 3.14, for which `libsql-experimental` has no wheel and the
build fails. `maxDuration` is 60s.

Environment Variables (Production, and Preview if used):

| Variable | Value |
| -------- | ----- |
| `PRELEGAL_DATABASE_URL` | `libsql://<db>.turso.io` |
| `PRELEGAL_DATABASE_AUTH_TOKEN` | the Turso token from step 1 |
| `PRELEGAL_SESSION_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
| `OPENROUTER_API_KEY` | your OpenRouter key |
| `PRELEGAL_CORS_ORIGINS` | the frontend's URL (set after step 3) |

Deploy, then verify: `GET https://<backend>.vercel.app/api/health` →
`{"status":"ok","service":"prelegal-api"}`.

## 3. Frontend project (Root Directory = `frontend`)

A standard Next.js app — Vercel auto-detects and builds it. Set one env var:

| Variable | Value |
| -------- | ----- |
| `NEXT_PUBLIC_API_URL` | the backend URL, e.g. `https://<backend>.vercel.app` |

This is baked into the browser bundle at build time, so a rebuild is required to
change it. Deploy, then confirm sign-up / sign-in and a document chat work end
to end.

## 4. Wire CORS

Set `PRELEGAL_CORS_ORIGINS` on the **backend** project to the frontend's URL
(comma-separated for multiple origins) and redeploy the backend. Only the
production frontend origin is allowlisted by default; Vercel *preview* deploys
get per-deploy URLs you'd need to add explicitly.

---

## Notes & caveats

- **Secrets.** `.env` is git-ignored and never committed. Set all secrets in the
  Vercel dashboard. Rotate any key shared in plaintext.
- **Function bundle size.** `litellm` is large. If the backend function exceeds
  Vercel's unzipped limit, trim `requirements.txt` or swap to a lighter LLM
  client (`llm_client.py` is the only backend LLM usage).
- **Function timeout.** A normal LLM turn takes a few seconds; the retry policy
  (`llm_client.py`: 2 attempts × LiteLLM `num_retries` × a 30s timeout) can
  exceed 60s under a sustained provider outage. 60s is the Hobby ceiling; Pro
  can raise `maxDuration`.
- **Local development is unchanged.** `docker compose up` (frontend :3000 +
  backend :8000, cross-origin) works exactly as before, using the local SQLite
  file.
