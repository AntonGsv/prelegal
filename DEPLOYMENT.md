# Deploying Prelegal to Vercel (PL-8)

Prelegal deploys as **two Vercel projects from this one GitHub repo**:

| Project  | Root Directory | Framework preset | Serves |
| -------- | -------------- | ---------------- | ------ |
| Frontend | `frontend`     | Next.js          | The web app (browser) |
| Backend  | `backend`      | FastAPI (Python) | The `/api/*` JSON API |

The browser calls the backend **cross-origin**: the frontend build bakes in the
backend's URL (`NEXT_PUBLIC_API_URL`) and the backend allows the frontend's
origin via CORS (`PRELEGAL_CORS_ORIGINS`). Auth is a stateless Bearer token in
`localStorage`, so no cookies/same-site concerns.

The database moves from a local SQLite file to a hosted **Turso** libSQL
database (a Vercel serverless function has an ephemeral filesystem, so a local
file would not persist).

---

## 1. Provision Turso

```bash
turso db create prelegal
turso db show prelegal --url            # -> libsql://<db>.turso.io
turso db tokens create prelegal         # -> the auth token
```

Schema is created automatically on first backend cold start (idempotent
`CREATE TABLE IF NOT EXISTS` in the FastAPI `lifespan` hook), so no manual
migration step is required.

## 2. Deploy the backend project

1. New Vercel Project → import this repo → **Root Directory = `backend`**.
   Vercel detects FastAPI and serves the `app` exported by `backend/index.py`
   (a thin ASGI shim that puts `src/` on the path). Python is pinned to 3.12 via
   `backend/.python-version`. Dependencies install from
   `backend/requirements.txt` via a plain `pip install`; `backend/.vercelignore`
   excludes the uv manifests (`pyproject.toml`, `uv.lock`) from the upload so
   Vercel takes this path instead of trying to `uv sync` the project (which the
   repo never installs — see the `.vercelignore` comment). `backend/vercel.json`
   sets `maxDuration: 60`. A normal LLM turn takes a few seconds, but the retry
   policy (`llm_client.py`: 2 outer attempts × LiteLLM `num_retries` × a 30s
   per-call timeout) can, under a sustained provider outage, exceed 60s and
   surface as a `504` timeout instead of the app's clean `502`. 60s is the Hobby
   plan's max duration; on Pro you can raise `maxDuration` (e.g. 120) if you see
   504s under provider slowness.
2. Set Environment Variables (Production, and Preview if used):

   | Variable | Value |
   | -------- | ----- |
   | `PRELEGAL_DATABASE_URL` | `libsql://<db>.turso.io` |
   | `PRELEGAL_DATABASE_AUTH_TOKEN` | the Turso token from step 1 |
   | `PRELEGAL_SESSION_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
   | `OPENROUTER_API_KEY` | your OpenRouter key |
   | `PRELEGAL_CORS_ORIGINS` | the frontend's URL, e.g. `https://prelegal.vercel.app` |

3. Deploy. Verify: `GET https://<backend>.vercel.app/api/health` → `{"status":"ok",...}`.

> `PRELEGAL_CORS_ORIGINS` is a comma-separated list. Only the **production**
> frontend origin is allowlisted by default; Vercel *preview* deployments get
> per-deploy URLs that won't match. Add specific preview origins if you need the
> preview frontend to reach the production backend.

## 3. Deploy the frontend project

1. New Vercel Project → same repo → **Root Directory = `frontend`** (Next.js
   auto-detected).
2. Set Environment Variable:

   | Variable | Value |
   | -------- | ----- |
   | `NEXT_PUBLIC_API_URL` | the backend URL, e.g. `https://<backend>.vercel.app` |

   This is baked into the browser bundle at build time — a rebuild is required
   to change it.
3. Deploy, then confirm sign-up / sign-in and a document chat work end to end.

If you set the frontend origin in step 2 before the frontend URL was known,
update `PRELEGAL_CORS_ORIGINS` on the backend and redeploy the backend.

---

## Notes & caveats

- **Secrets.** `.env` is git-ignored and never committed. Set all secrets in the
  Vercel dashboard, not in the repo. Rotate any key that has been shared in
  plaintext (chat, screenshots, etc.).
- **Function bundle size.** `litellm` is a large dependency. If the backend
  function exceeds Vercel's unzipped size limit, trim `requirements.txt` or swap
  to a lighter LLM client — the only backend LLM usage is in `llm_client.py`.
- **Cold starts.** The first request after idle pays the DB schema-init +
  Python cold-start cost. This is expected for serverless.
- **Local development is unchanged.** With no `PRELEGAL_DATABASE_URL` (or a
  `file:` URL) and no auth token, the app uses the local SQLite file exactly as
  before (`docker compose` / `scripts/start-*`).
