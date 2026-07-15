import type { NextConfig } from "next";

/**
 * Static export is opt-in via the `STATIC_EXPORT` env var, set only by the
 * Vercel build (see the root `vercel.json`). On Vercel, `next build` emits a
 * fully static site to `frontend/out/` that the CDN serves, while `/api/*` is
 * routed to the FastAPI Python function — one project, one origin, no CORS.
 * All pages are already static/SSG, so nothing renders at request time;
 * `images.unoptimized` is required because the export has no image-optimization
 * server.
 *
 * Without the flag (local `next dev`/`next build`, Docker `next start`), the app
 * builds in normal server mode exactly as before — so `docker compose up` is
 * unaffected.
 */
const staticExport = Boolean(process.env.STATIC_EXPORT);

const nextConfig: NextConfig = staticExport
  ? { output: "export", images: { unoptimized: true } }
  : {};

export default nextConfig;
