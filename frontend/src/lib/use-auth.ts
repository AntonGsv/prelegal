"use client";

import { useEffect, useState } from "react";

import {
  AUTH_CHANGED_EVENT,
  getUser,
  type AuthUser,
} from "./auth-storage";

/**
 * Read the signed-in user on the client and stay in sync with session changes
 * (sign in/out in this tab via `AUTH_CHANGED_EVENT`, or in another tab via the
 * native `storage` event). Returns `null` before mount and when signed out.
 */
export function useAuthUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}
