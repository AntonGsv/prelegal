"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { isLoggedIn } from "../src/lib/auth-storage";

/**
 * Client-side auth gate for the foundation phase. While PL-4 is
 * "fake login, no authentication," this gate keeps the unauthenticated
 * landing page out of the signed-in shell — `/` always bounces to
 * `/login` if the user isn't flagged as signed in, and `/dashboard`
 * does the same.
 *
 * The check is client-side on purpose: any future real session will
 * replace `isLoggedIn()` without touching the call sites.
 *
 * Children render immediately rather than waiting on the auth check, so an
 * unauthenticated visitor can see a flash of the next route's markup before
 * the redirect fires. Acceptable for now: nothing rendered behind the gate
 * is sensitive (the login is cosmetic and the NDA flow has no real data).
 * Gating the render on a `ready` flag was tried and reverted — it delays
 * first paint enough to break keyboard-focus timing in existing E2E tests.
 * Revisit this trade-off once real sessions replace `isLoggedIn()`.
 */
const PUBLIC_ROUTES = new Set<string>(["/login"]);

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

    if (loggedIn && pathname === "/") {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
