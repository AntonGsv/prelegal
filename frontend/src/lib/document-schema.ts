import { z } from "zod";
import type { DocumentConfig } from "./document-registry";

/**
 * Build a Zod schema for a document from its registry field list. This is the
 * completeness gate: a document is ready to generate once every required field
 * validates. Mirrors the validation the old hand-written NDA schema encoded,
 * but derived from the registry so every document type stays in sync.
 */
export function buildDocumentSchema(
  config: DocumentConfig,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of config.fields) {
    let schema: z.ZodString =
      field.kind === "email"
        ? z.string().email(`Valid ${field.label} required`)
        : z.string();

    const min = field.minLength ?? (field.required ? 1 : 0);
    if (min > 0) {
      schema = schema.min(min, `${field.label} is required`);
    }

    shape[field.key] = field.required ? schema : schema.optional();
  }

  return z.object(shape);
}
