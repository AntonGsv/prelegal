# Deploying Prelegal to Vercel (PL-8)

Prelegal deploys as **one Vercel project** for the whole repo. The Next.js
frontend is built as a **static export** and served by Vercel's CDN; the FastAPI
backend runs as a **Python serverless function** at `api/index.py`. All `/api/*`
requests are rewritten to that function, so the app is served from a **single
origin — no CORS**. The database is a hosted **Turso** libSQL database (a
serverless filesystem is ephemeral, so a local SQLite file would not persist).

How it fits together (all wired in the root `vercel.json`):

```
Browser ──▶ https://<app>.vercel.app
              ├── /              ─▶ Vercel CDN  ─▶ frontend/out (static export)
              ├── /dashboard …   ─▶ Vercel CDN  ─▶ frontend/out/*.html
              └── /api/*         ─▶ Python fn   ─▶ api/index.py → prelegal_api.main:app
                                                     └─▶ Turso (libSQL) + OpenRouter
```

## 1. Provision Turso

```bash
turso db create prelegal
turso db show prelegal --url        # -> libsql://<db>.turso.io
turso db tokens create prelegal     # -> the auth token
```

Schema is created automatically on the first request (idempotent
`CREATE TABLE IF NOT EXISTS` in the FastAPI `lifespan` hook on cold start).

## 2. Create the Vercel project

New Project → import this repo → **Root Directory = repository root** (the
default — do **not** set it to `frontend` or `backend`).

The root `vercel.json` drives everything:
- `buildCommand`: `cd frontend && npm install && STATIC_EXPORT=1 npm run build`
  — builds the static export into `frontend/out`. `STATIC_EXPORT=1` opts the
  Next config into `output: "export"` (locally / in Docker, without the flag, the
  app builds in normal server mode — so `docker compose up` is unaffected).
- `outputDirectory: frontend/out` — the static site the CDN serves.
- `functions."api/index.py".includeFiles: "backend/**"` — bundles the backend
  source into the function (`api/index.py` puts `backend/src` on `sys.path` and
  re-exports `prelegal_api.main:app`).
- `rewrites: /api/(.*) → /api/index` — routes API calls to the function (which
  receives the original path, so FastAPI's own `/api/...` routes match).

Python is pinned to 3.12 via the root `.python-version` (matches the
`libsql-experimental` manylinux wheel); function deps install from the root
`requirements.txt`.

## 3. Set Environment Variables

In the project's **Settings → Environment Variables** (Production, and Preview
if used):

| Variable | Value |
| -------- | ----- |
| `PRELEGAL_DATABASE_URL` | `libsql://<db>.turso.io` |
| `PRELEGAL_DATABASE_AUTH_TOKEN` | the Turso token from step 1 |
| `PRELEGAL_SESSION_SECRET` | a long random string (e.g. `openssl rand -hex 32`) |
| `OPENROUTER_API_KEY` | your OpenRouter key |

You do **not** need `PRELEGAL_CORS_ORIGINS` (same origin) or `NEXT_PUBLIC_API_URL`
(the committed `frontend/.env.production` sets it empty = same-origin `/api/...`).
Setting `NEXT_PUBLIC_API_URL` in the dashboard would override that, so leave it
unset unless you intentionally point the frontend at a different backend.

## 4. Deploy & verify

Deploy, then check:
- `https://<app>.vercel.app/api/health` → `{"status":"ok","service":"prelegal-api"}`
- open the site, sign up / sign in, and run a document chat end to end.

To redeploy after code changes, push to the branch Vercel tracks (`main`).

---

## Notes & caveats

- **Secrets.** `.env` is git-ignored and never committed. Set all secrets in the
  Vercel dashboard. Rotate any key that has been shared in plaintext.
- **Function bundle size.** `litellm` is a large dependency. If the function
  exceeds Vercel's unzipped size limit, trim `requirements.txt` or swap to a
  lighter LLM client (`llm_client.py` is the only backend LLM usage).
- **Function timeout.** A normal LLM turn takes a few seconds, but the retry
  policy (`llm_client.py`: 2 outer attempts × LiteLLM `num_retries` × a 30s
  per-call timeout) can exceed 60s under a sustained provider outage and surface
  as a `504` instead of the app's clean `502`. Add a `functions` `maxDuration` in
  `vercel.json` (60s is the Hobby ceiling; Pro allows more) if you hit this.
- **Local development is unchanged.** Without `STATIC_EXPORT`, the frontend
  builds in server mode; `docker compose up` (frontend :3000 + backend :8000,
  cross-origin via `NEXT_PUBLIC_API_URL` + `PRELEGAL_CORS_ORIGINS`) works exactly
  as before, using the local SQLite file.
```
