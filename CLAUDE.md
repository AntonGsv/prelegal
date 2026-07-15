# Prelegal Project

## Overview

Platform for generating common legal agreements.

The available documents are covered in the `catalog.json` file in the project root, included here:

@catalog.json

Current state (through PL-7): a full-stack V1 platform — Next.js frontend, FastAPI backend, libSQL database, and Docker Compose — with **real accounts and per-user document history**. It supports **all 11 legal document types** in `catalog.json`, each created via a **freeform AI chat**: the assistant asks about each field, extracts them from the conversation, and fills a live document preview; the user downloads the PDF once every field is collected. The dashboard offers a **gallery** of all documents plus a **freeform finder** where the user describes what they need and the AI routes them to the right document (or explains an unsupported request and offers the closest supported document). Everything is driven by a single **document registry** (`document_registry.json`) — adding a document type is a registry edit, not new code.

### Auth & document history (PL-7 decisions)

- **Real accounts.** Sign up / sign in with email + password. Passwords are hashed with stdlib PBKDF2-HMAC and stored in the libSQL `users` table (`security.py`, `auth.py`, `database.py`). Auth crypto is deliberately dependency-free (stdlib `hashlib`/`hmac`) to avoid native wheels, matching the libSQL fallback philosophy.
- **Bearer-token sessions.** A successful register/login returns a compact HMAC-signed token (a mini-JWT, `security.create_token`) that the frontend keeps in `localStorage` (`auth-storage.ts`) and sends as `Authorization: Bearer`. The backend is stateless — no session store; the token is verified per request (`require_user` dependency). `PRELEGAL_SESSION_SECRET` signs tokens (dev default provided).
- **Per-user history.** Generating a PDF also saves `{ slug, fields }` to a `documents` table keyed by user. A document is fully reconstructable from slug + fields (template + config derive from the slug), so revisiting re-renders the read-only preview and re-downloads an identical PDF. History lives at `/history`; a saved document opens at `/documents/[slug]/view?id=N` (static per slug, id read client-side — the runner has no source `.md` files).
- **Draft disclaimer.** Every generated document carries a "draft, not legal advice, review by an attorney" disclaimer, defined once as `DRAFT_DISCLAIMER` in `document-template.ts` and rendered identically in the live preview and the PDF cover page.
- **Endpoints:** `POST /api/auth/register` (409 dup email), `POST /api/auth/login` (401), `GET /api/auth/me`; and Bearer-gated `POST|GET /api/documents/history`, `GET /api/documents/history/{id}`.
- **UI polish.** Brand colors are tokenized in `globals.css` (`--brand-*`, `--primary` remapped to brand blue) instead of ad-hoc hex; there is a real marketing landing page (`/`), a header account menu, and `next-themes` dark mode.

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
- Model `openrouter/openai/gpt-oss-120b`, provider pinned to Cerebras via `extra_body={"provider": {"order": ["cerebras"]}}`, `reasoning_effort="low"`, and a Pydantic model as `response_format` for structured outputs.

### Document chat architecture (PL-5 / PL-6 decisions)

The AI chat generalizes across all document types via a **registry-driven** design. `document_registry.json` (a byte-identical copy in `backend/src/prelegal_api/` and `frontend/src/lib/`, kept in sync by a guard test) is the single source of truth for each document's fields, party roles, and chat framing. The backend builds a per-document Pydantic extraction schema and system prompt from it via `create_model`; the frontend builds Zod validation, the live preview, and the PDF cover page from the same file. These implementation choices are preserved from PL-5:

- **Stateless backend.** The server keeps no session state. The frontend sends the *full* conversation history on every turn; the model re-extracts *all* fields from the whole conversation each turn (single source of truth, no server-side merge). See `run_chat_turn` in `backend/src/prelegal_api/document_chat.py`.
- **Non-streaming.** Each turn is a single request/response returning `{ reply, fields }` — `reply` is the assistant's next message, `fields` is every field known so far (null until provided).
- **Read-only preview + confirm in chat.** `document-preview.tsx` renders the live document and fills as fields arrive; the user reviews and confirms *in the chat*, not via an editable form. PDF download unlocks only once every required field validates (`document-chat-data.ts` → registry-built Zod schema).
- **Resilience.** The LLM call is wrapped with retries (`num_retries` + an outer retry loop covering empty/unparseable responses) and a request timeout, so a transient provider hiccup does not surface as an error to the user. This lives in `llm_client.run_structured_turn`, shared by chat and detection. The endpoint returns 503 if the API key is unconfigured and 502 if the AI service ultimately fails.
- **Flat fields (V1).** Each document is a standalone 2-party contract with a flat field set and a synthesized cover page; structurally complex data (DPA subprocessors, PSA SOWs, Partnership trademark terms) is collected as free-text fields.
- **Template bodies.** The standard-terms body is the raw `templates/*.md`, mirrored into `frontend/src/content/templates/` (guarded against drift by a test) and read server-side in the `[slug]/create` page, then passed to the client for preview/PDF. `renderStandardTerms` (in `document-template.ts`, shared by preview and PDF) cleans it: substitutes placeholder values (only the NDA declares any — others rely on the cover page to carry values), then strips inline HTML (the AI Addendum template uses `<span>` markup) and markdown bold.
- **Endpoints:** `POST /api/documents/{slug}/chat` (chat for one document type; 404 on unknown slug) and `POST /api/documents/detect` (freeform document-type detection → `{ reply, matchedSlug, suggestedSlug }`). Both take `{ messages: [{ role, content }] }`.

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
│   ├── main.py                  # FastAPI app, routes, CORS
│   ├── document_registry.json   # Registry: fields/roles/prompts for all 11 docs (source of truth)
│   ├── document_registry.py     # Registry loader + validation
│   ├── document_chat.py         # Per-document chat: dynamic schema + prompt + run_chat_turn
│   ├── document_detect.py       # Freeform document-type detection
│   ├── document_history.py      # Per-user saved documents (save/list/get) — PL-7
│   ├── auth.py                  # Register/login/token-resolve (Pydantic models + logic) — PL-7
│   ├── security.py              # Stdlib password hashing + signed session tokens — PL-7
│   ├── llm_client.py            # LiteLLM/Cerebras wrapper + shared structured-output retry loop
│   ├── database.py              # libSQL connect + users/documents schema init + query helpers
│   └── settings.py              # Env-based config (incl. session_secret)
└── tests/            # pytest
frontend/
├── app/              # Next.js App Router pages
│   ├── page.tsx      # Marketing landing page (public)
│   ├── login/ · signup/          # Real auth (email + password)
│   ├── dashboard/    # Signed-in home: document gallery + freeform finder
│   ├── history/      # "My documents": per-user saved-document history
│   ├── documents/[slug]/create/  # Document creation flow (AI chat), one dynamic route for all 11
│   ├── documents/[slug]/view/    # Read-only view of a saved document (?id=N), static per slug
│   └── nda/mutual/create/        # Legacy redirect → /documents/mutual-nda/create
├── components/       # app-header, auth-gate, auth-form, theme-provider/-toggle, document-chat,
│                     #   document-preview, document-view, document-gallery/-finder/-history + ui/
├── src/lib/          # Business logic (document-registry, schema, template, PDF, auth-storage, api-client, use-auth)
├── src/content/templates/  # Mirror of repo-root templates/*.md (read server-side for preview/PDF)
└── src/types/        # TypeScript types
templates/            # 11 CommonPaper legal templates (CC BY 4.0) + LICENSE
scripts/              # Start/stop scripts per platform
docker-compose.yml    # frontend (:3000) + backend (:8000)
```

### Key Files
- `document_registry.json` — single source of truth for every document's fields, party roles, and chat framing (twin copy: `backend/src/prelegal_api/` + `frontend/src/lib/`, guarded by a test)
- `frontend/components/document-chat.tsx` — AI chat UI (messages, live preview, PDF download), parameterized by document config
- `frontend/components/document-preview.tsx` — live document preview, renders sections generically from the registry
- `frontend/components/document-gallery.tsx` / `document-finder.tsx` — dashboard gallery + freeform "describe what you need" finder
- `frontend/src/lib/document-registry.ts` — typed registry loader + field/group helpers
- `frontend/src/lib/api-client.ts` — frontend → backend client (`sendDocumentChat`, `detectDocumentType`)
- `frontend/src/lib/document-chat-data.ts` — validates gathered fields against the registry-built schema (completeness check)
- `frontend/src/lib/document-schema.ts` — builds a Zod schema from a document's registry fields
- `frontend/src/lib/document-template.ts` — cover-page renderer, placeholder substitution, `renderStandardTerms`
- `frontend/src/lib/template-loader.ts` — server-only reader for a document's `.md` body
- `frontend/src/lib/pdf-generator.ts` — PDF generation with jsPDF (`generateDocumentPdf`)
- `frontend/src/lib/auth-storage.ts` — fake-login localStorage flag (swappable for real auth)
- `backend/src/prelegal_api/document_chat.py` / `document_detect.py` / `document_registry.py` / `llm_client.py` — registry-driven chat, detection, loader, and shared LLM client (LiteLLM → OpenRouter → Cerebras, structured outputs)
- `backend/src/prelegal_api/main.py` — FastAPI app & routes (`/api/health`, `/api/documents/{slug}/chat`, `/api/documents/detect`)
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
