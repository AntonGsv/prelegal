"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "./ui/button";

/**
 * Light/dark toggle for the header. Renders a stable placeholder until mounted
 * so the server and client markup match (the resolved theme is only known on
 * the client).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mount guard: the resolved theme is only known on the client, so we render a
  // stable icon on the server and swap after mount. This one-time flip is the
  // documented next-themes pattern; the setState-in-effect here is intentional.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      data-testid="theme-toggle"
    >
      {mounted && isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
