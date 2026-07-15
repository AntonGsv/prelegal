import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTH_CHANGED_EVENT,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  clearSession,
  getToken,
  getUser,
  isLoggedIn,
  setSession,
  type AuthUser,
} from "./auth-storage";

const user: AuthUser = {
  id: 1,
  email: "founder@example.com",
  displayName: "Founder",
};

describe("auth-storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reports signed-out when no token is stored", () => {
    expect(isLoggedIn()).toBe(false);
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it("stores the token and user on setSession", () => {
    setSession("abc.def", user);

    expect(isLoggedIn()).toBe(true);
    expect(getToken()).toBe("abc.def");
    expect(getUser()).toEqual(user);
    expect(window.localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("abc.def");
    expect(window.localStorage.getItem(USER_STORAGE_KEY)).toContain(
      "founder@example.com",
    );
  });

  it("clears the session on clearSession", () => {
    setSession("abc.def", user);
    clearSession();

    expect(isLoggedIn()).toBe(false);
    expect(getToken()).toBeNull();
    expect(getUser()).toBeNull();
  });

  it("returns null for a corrupt user record", () => {
    window.localStorage.setItem(USER_STORAGE_KEY, "{not json");
    expect(getUser()).toBeNull();
  });

  it("dispatches an auth-changed event on session changes", () => {
    let changes = 0;
    const handler = () => {
      changes += 1;
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handler);

    setSession("abc.def", user);
    clearSession();

    window.removeEventListener(AUTH_CHANGED_EVENT, handler);
    expect(changes).toBe(2);
  });
});
