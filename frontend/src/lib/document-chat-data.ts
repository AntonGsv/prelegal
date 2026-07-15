import { buildDocumentSchema } from "./document-schema";
import type { DocumentConfig } from "./document-registry";
import type { PartialDocumentData } from "../types/chat";

/** A complete, validated set of field values for a document. */
export type DocumentData = Record<string, string>;

/**
 * Validate the fields gathered so far against the document's schema. Returns the
 * fully-typed data once every required field is present and valid, or `null`
 * while anything is still missing/invalid.
 */
export function toCompleteDocumentData(
  config: DocumentConfig,
  fields: PartialDocumentData,
): DocumentData | null {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.trim() !== "") {
      cleaned[key] = value;
    }
  }

  const result = buildDocumentSchema(config).safeParse(cleaned);
  return result.success ? (result.data as DocumentData) : null;
}
