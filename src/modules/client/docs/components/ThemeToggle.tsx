/**
 * ThemeToggle.tsx — light/dark toggle for the docs navbar.
 *
 * Layer: client / docs / components
 *
 * This app's theme string is "{color}-{mode}" (e.g. "teal-light"), not a
 * bare "light"/"dark" — see ThemeProvider's defaultTheme and
 * AppearanceSettings.tsx's identical toggleMode logic. This toggle only
 * flips the mode half, preserving whatever accent color is already set.
 *
 * Renders nothing until mounted to avoid a hydration mismatch: the server
 * has no theme cookie to read, so resolvedTheme is only accurate client-side.
 */

"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_COLOR = "teal";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="size-8" aria-hidden />;
  }

  const [rawColor, rawMode] = (resolvedTheme ?? `${DEFAULT_COLOR}-light`).split("-");
  const color = rawColor || DEFAULT_COLOR;
  const isDark = rawMode === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(`${color}-${isDark ? "light" : "dark"}`)}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
