"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "./ui/button";
import { signOut } from "../src/lib/auth-storage";

/**
 * Shared header used by the post-login pages. Mirrors the visual language of
 * the original landing header (brand wordmark + nav), and adds a Sign Out
 * control. This is intentionally a client component because Sign Out mutates
 * `localStorage` and routes back to `/login`.
 */
export function AppHeader() {
  const router = useRouter();

  const handleSignOut = () => {
    signOut();
    router.replace("/login");
  };

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/dashboard" className="text-xl font-bold">
          Prelegal
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline">New document</Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            aria-label="Sign out"
            data-testid="sign-out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}