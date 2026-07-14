import { describe, it, expect, beforeEach } from "vitest";
import {
  AUTH_STORAGE_KEY,
  isLoggedIn,
  signIn,
  signOut,
} from "./auth-storage";

describe("auth-storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns false when no flag is set", () => {
    expect(isLoggedIn()).toBe(false);
  });

  it("returns true after signIn() is called", () => {
    signIn();
    expect(isLoggedIn()).toBe(true);
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBe("true");
  });

  it("returns false again after signOut() is called", () => {
    signIn();
    signOut();
    expect(isLoggedIn()).toBe(false);
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });
});