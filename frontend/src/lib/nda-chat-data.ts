import { ndaFormSchema, type NdaFormData } from "./nda-schema";
import type { PartialNdaData } from "../types/chat";

/**
 * Validate the fields gathered so far against the canonical NDA schema.
 * Returns the fully-typed data once every field is present and valid, or
 * `null` while anything is still missing/invalid. This reuses the same Zod
 * schema the old form used, so "complete" means exactly what it did before.
 */
export function toCompleteNdaData(fields: PartialNdaData): NdaFormData | null {
  const cleaned: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.trim() !== "") {
      cleaned[key] = value;
    }
  }

  const result = ndaFormSchema.safeParse(cleaned);
  return result.success ? result.data : null;
}
