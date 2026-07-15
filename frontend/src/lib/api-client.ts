import type { ChatMessage, PartialDocumentData } from "../types/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface DocumentChatResponse {
  reply: string;
  fields: PartialDocumentData;
}

export interface DetectResponse {
  reply: string;
  matchedSlug: string | null;
  suggestedSlug: string | null;
}

async function postJson<T>(path: string, body: unknown, what: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${what} failed (${response.status})`);
  }

  return (await response.json()) as T;
}

/**
 * Send the full conversation to the backend and get the assistant's next reply
 * plus every field it has determined so far for the given document type. The
 * backend is stateless, so the entire message history is sent each turn.
 */
export function sendDocumentChat(
  slug: string,
  messages: ChatMessage[],
): Promise<DocumentChatResponse> {
  return postJson<DocumentChatResponse>(
    `/api/documents/${slug}/chat`,
    { messages },
    "Chat request",
  );
}

/**
 * Ask the backend to identify which supported document a freeform request maps
 * to. Returns a matched slug (to route to), or a suggested closest slug plus an
 * explanation when the requested document isn't supported.
 */
export function detectDocumentType(
  messages: ChatMessage[],
): Promise<DetectResponse> {
  return postJson<DetectResponse>(
    "/api/documents/detect",
    { messages },
    "Detect request",
  );
}
