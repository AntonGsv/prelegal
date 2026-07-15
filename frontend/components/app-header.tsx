"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, FolderClock, LogOut } from "lucide-react";

import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { clearSession } from "../src/lib/auth-storage";
import { useAuthUser } from "../src/lib/use-auth";

function initialsFor(user: { displayName: string | null; email: string }): string {
  const source = user.displayName?.trim() || user.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]);
  return (letters.join("") || source[0] || "?").toUpperCase();
}

/**
 * Shared header for the signed-in app: brand wordmark, a "New document" action,
 * a theme toggle, and an account menu (email + links to history and sign out).
 */
export function AppHeader() {
  const router = useRouter();
  const user = useAuthUser();

  const handleSignOut = () => {
    clearSession();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="text-xl font-bold text-brand-navy dark:text-white"
        >
          Prelegal
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="outline">New document</Button>
          </Link>
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Account menu"
                  data-testid="account-menu"
                  className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              }
            >
              <Avatar>
                <AvatarFallback>
                  {user ? initialsFor(user) : "?"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel className="truncate">
                {user?.displayName || user?.email || "Account"}
              </DropdownMenuLabel>
              {user?.displayName && (
                <p className="truncate px-2 pb-1 text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/history" data-testid="nav-history" />}
              >
                <FolderClock className="h-4 w-4" />
                My documents
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/dashboard" />}
              >
                <FileText className="h-4 w-4" />
                New document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                data-testid="sign-out"
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
