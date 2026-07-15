import type { ChatMessage, PartialDocumentData } from "../types/chat";
import { getToken, type AuthUser } from "./auth-storage";

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

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface SavedDocumentSummary {
  id: number;
  slug: string;
  name: string;
  title: string;
  createdAt: string | null;
}

export interface SavedDocumentDetail extends SavedDocumentSummary {
  fields: Record<string, string>;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  /** Attach the bearer token when one is stored. Defaults to true. */
  auth?: boolean;
}

/**
 * Single fetch wrapper: JSON in/out, bearer-token attachment, and error
 * messages that prefer the backend's `detail` (so, e.g., "An account with this
 * email already exists" reaches the form) over a bare status code.
 */
async function request<T>(
  path: string,
  what: string,
  { method = "GET", body, auth = true }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await extractDetail(response);
    throw new Error(detail ?? `${what} failed (${response.status})`);
  }

  return (await response.json()) as T;
}

async function extractDetail(response: Response): Promise<string | null> {
  try {
    const data = await response.json();
    if (data && typeof data.detail === "string") return data.detail;
  } catch {
    // Non-JSON error body — fall through to the generic message.
  }
  return null;
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
  return request<DocumentChatResponse>(
    `/api/documents/${slug}/chat`,
    "Chat request",
    { method: "POST", body: { messages } },
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
  return request<DetectResponse>("/api/documents/detect", "Detect request", {
    method: "POST",
    body: { messages },
  });
}

/** Register a new account; returns a session token and the user record. */
export function registerUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/register", "Sign up", {
    method: "POST",
    body: { email, password, displayName },
    auth: false,
  });
}

/** Sign in to an existing account; returns a session token and the user. */
export function loginUser(
  email: string,
  password: string,
): Promise<AuthResponse> {
  return request<AuthResponse>("/api/auth/login", "Sign in", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

/** Fetch the currently signed-in user (validates the stored token). */
export function fetchCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>("/api/auth/me", "Load account");
}

/** Persist a generated document to the user's history. */
export function saveDocument(
  slug: string,
  fields: Record<string, string>,
  title?: string,
): Promise<SavedDocumentDetail> {
  return request<SavedDocumentDetail>("/api/documents/history", "Save document", {
    method: "POST",
    body: { slug, fields, title },
  });
}

/** List the signed-in user's previously generated documents (newest first). */
export function listDocuments(): Promise<SavedDocumentSummary[]> {
  return request<SavedDocumentSummary[]>(
    "/api/documents/history",
    "Load documents",
  );
}

/** Fetch a single saved document, including its full field set. */
export function getDocument(id: number): Promise<SavedDocumentDetail> {
  return request<SavedDocumentDetail>(
    `/api/documents/history/${id}`,
    "Load document",
  );
}
