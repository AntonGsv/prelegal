# Prelegal Project

## Overview

Platform for generating common legal agreements.

The available documents are covered in the `catalog.json` file in the project root, included here:

@catalog.json

Current state (through PL-4): a full-stack V1 foundation — Next.js frontend, FastAPI backend, libSQL database, and Docker Compose — with a cosmetic ("fake") login. It supports only the Mutual NDA document, via a form (no AI chat yet).

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature — do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

Branch naming: `feature/PL-N-description` (feature branches → main).

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

- Skill: `Cerebras Inference` (`.claude/skills/cerebras/SKILL.md`)
- `OPENROUTER_API_KEY` in the `.env` file in the project root

## Technical design

The project runs via Docker Compose as two services: `frontend` (`next start`, :3000) and `backend` (`uvicorn`, :8000). The frontend is a standalone service, not served by FastAPI.

- The backend is a uv project in `backend/`, using FastAPI. Exposes `GET /api/health`.
- The frontend is in `frontend/`.
- The database is Turso / libSQL — SQLite programming model with a local file for development, Vercel-compatible for serverless deployment (a container-local SQLite file would not persist). It holds a `users` table for future sign up / sign in. Schema init is idempotent and runs on backend startup; data persists in a named Docker volume across restarts. `database.py` falls back to `sqlite3` for local `file:` URLs when the native libSQL wheel is unavailable.
- Scripts in `scripts/` (each wraps `docker compose up`/`down`):

```bash
# macOS / Linux
scripts/start-unix.sh       # Start
scripts/stop-unix.sh        # Stop

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```

Frontend at http://localhost:3000, backend at http://localhost:8000.

### Stack
- **Framework**: Next.js 16 (App Router, RSC enabled)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui (base-nova style)
- **Forms**: React Hook Form + Zod validation
- **PDF**: jsPDF for document generation
- **Backend**: FastAPI (uv project) in `backend/`
- **Database**: Turso / libSQL (SQLite-compatible, Vercel-ready)
- **Testing**: Vitest (unit) + Playwright (E2E) for frontend; pytest for backend

### Structure
```
backend/
├── src/prelegal_api/
│   ├── main.py       # FastAPI app, routes, CORS
│   ├── database.py   # libSQL connect + users-table schema init
│   └── settings.py   # Env-based config
└── tests/            # pytest
frontend/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Landing page
│   ├── login/        # Fake login (sets localStorage flag)
│   ├── dashboard/    # Signed-in home
│   └── nda/mutual/create/  # NDA creation flow
├── components/       # app-header, auth-gate, login-form + ui/ (shadcn)
├── src/lib/          # Business logic (schema, template, PDF, auth)
└── src/types/        # TypeScript types
scripts/              # Start/stop scripts per platform
docker-compose.yml    # frontend (:3000) + backend (:8000)
```

### Key Files
- `frontend/src/lib/nda-schema.ts` — Zod schema for NDA data
- `frontend/src/lib/nda-template.ts` — NDA template engine
- `frontend/src/lib/pdf-generator.ts` — PDF generation with jsPDF
- `frontend/src/lib/auth-storage.ts` — fake-login localStorage flag (swappable for real auth)
- `backend/src/prelegal_api/main.py` — FastAPI app & routes
- `backend/src/prelegal_api/database.py` — libSQL `users`-table init
- `frontend/e2e/` — Playwright E2E tests

### Commands
```bash
# frontend/
npm run dev       # Development server
npm run build     # Production build
npm run test      # Unit tests (Vitest, watch)
npm run test:run  # Unit tests (single run)
npm run test:e2e  # E2E tests (Playwright)
npm run test:all  # Unit + E2E
```

## Color Scheme

- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`
