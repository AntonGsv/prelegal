import type { ChatMessage, PartialNdaData } from "../types/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface NdaChatResponse {
  reply: string;
  fields: PartialNdaData;
}

/**
 * Send the full conversation to the backend and get the assistant's next reply
 * plus every NDA field it has determined so far. The backend is stateless, so
 * the entire message history is sent each turn.
 */
export async function sendNdaChat(
  messages: ChatMessage[],
): Promise<NdaChatResponse> {
  const response = await fetch(`${API_URL}/api/nda/mutual/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed (${response.status})`);
  }

  return (await response.json()) as NdaChatResponse;
}
