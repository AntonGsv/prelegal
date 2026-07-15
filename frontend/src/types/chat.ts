export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * The AI knows only some fields at any point in the conversation, and the
 * backend sends `null` for values it hasn't gathered yet. Fields are generic
 * across document types, so this is an open string map keyed by field key.
 */
export type PartialDocumentData = Record<string, string | null | undefined>;
