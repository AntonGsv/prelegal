"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isLoggedIn } from "../src/lib/auth-storage";

/**
 * Client-side auth gate. Public routes (the marketing landing page and the
 * sign-in / sign-up screens) are always reachable; everything else redirects to
 * `/login` unless a session token is present (`isLoggedIn()`). Signed-in users
 * who land on an auth screen are bounced to the dashboard.
 *
 * The check is client-side on purpose, matching the bearer-token session that
 * lives in `localStorage`; `isLoggedIn()` is the single swap-in point.
 *
 * Children render immediately rather than waiting on the auth check, so an
 * unauthenticated visitor can see a flash of the next route's markup before the
 * redirect fires. Acceptable here: nothing rendered behind the gate is
 * sensitive, and the per-user API data is separately protected server-side by
 * the bearer token. Gating the render on a `ready` flag was tried and reverted —
 * it delays first paint enough to break keyboard-focus timing in E2E tests.
 */
const PUBLIC_ROUTES = new Set<string>(["/", "/login", "/signup"]);
const AUTH_ROUTES = new Set<string>(["/login", "/signup"]);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublic = pathname !== null && PUBLIC_ROUTES.has(pathname);
    const loggedIn = isLoggedIn();

    if (!loggedIn && !isPublic) {
      router.replace("/login");
      return;
    }

    if (loggedIn && pathname !== null && AUTH_ROUTES.has(pathname)) {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
