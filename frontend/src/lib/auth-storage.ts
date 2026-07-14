/**
 * Auth gate storage abstraction.
 *
 * PL-4 is a "fake login" foundation: there is no real authentication yet.
 * The platform only needs to know whether to keep showing the marketing
 * landing page or the signed-in dashboard.
 *
 * The implementation reads/writes a single flag in `localStorage`. The
 * helpers are intentionally minimal so they can be swapped for a real
 * session-backed implementation later without changing call sites.
 */

export const AUTH_STORAGE_KEY = "prelegal.auth.loggedIn";

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

export function signIn(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}