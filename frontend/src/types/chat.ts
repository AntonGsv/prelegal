import type { NdaFormData } from "../lib/nda-schema";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * The AI knows only some fields at any point in the conversation, and the
 * backend sends `null` for values it hasn't gathered yet.
 */
export type PartialNdaData = {
  [K in keyof NdaFormData]?: string | null;
};
