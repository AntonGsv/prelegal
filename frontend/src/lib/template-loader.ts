import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Server-only loader for a document's legal body text. The `.md` templates are
 * mirrored into `src/content/templates/` (a build-time copy of the repo-root
 * `templates/` directory) so the frontend container can read them without
 * reaching outside its own tree. Only ever import this from a Server Component.
 */
const TEMPLATES_DIR = path.join(process.cwd(), "src", "content", "templates");

export function loadTemplateBody(catalogFilename: string): string {
  // catalogFilename comes from the trusted registry; basename guards regardless.
  const safeName = path.basename(catalogFilename);
  return readFileSync(path.join(TEMPLATES_DIR, safeName), "utf-8");
}
