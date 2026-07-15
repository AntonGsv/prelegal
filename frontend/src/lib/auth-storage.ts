/**
 * Session storage for the real auth introduced in PL-7.
 *
 * A successful sign in / sign up returns a signed bearer token plus the user
 * record; both are kept in `localStorage`. The token is attached as
 * `Authorization: Bearer <token>` by the API client, and the user record backs
 * the header's account menu. These helpers are the single swap-in point the
 * `auth-gate`, `app-header`, and auth forms depend on.
 */

export interface AuthUser {
  id: number;
  email: string;
  displayName: string | null;
}

export const TOKEN_STORAGE_KEY = "prelegal.auth.token";
export const USER_STORAGE_KEY = "prelegal.auth.user";

/** Dispatched on the window whenever the session changes, so the header can
 * update without a full navigation. */
export const AUTH_CHANGED_EVENT = "prelegal:auth-changed";

function notifyChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export function setSession(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  notifyChange();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  notifyChange();
}
