"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const THEME_COLORS = [
  "zinc",
  "teal",
  "red",
  "rose",
  "orange",
  "green",
  "blue",
  "yellow",
  "violet",
] as const;

export type ThemeColor = (typeof THEME_COLORS)[number];
export type ThemeMode = "light" | "dark";

export interface ThemeContextValue {
  color: ThemeColor;
  mode: ThemeMode;
  theme: string;
  setColor: (color: ThemeColor) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  resetTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  color: "zinc",
  mode: "light",
  theme: "zinc-light",
  setColor: () => {},
  setMode: () => {},
  toggleMode: () => {},
  resetTheme: () => {},
});

export const STORAGE_KEY = "app-theme";
const DEFAULT_COLOR: ThemeColor = "zinc";
const DEFAULT_MODE: ThemeMode = "light";

function parseTheme(value: string): { color: ThemeColor; mode: ThemeMode } {
  const lastDash = value.lastIndexOf("-");
  if (lastDash === -1) return { color: DEFAULT_COLOR, mode: DEFAULT_MODE };
  const color = value.slice(0, lastDash) as ThemeColor;
  const mode = value.slice(lastDash + 1) as ThemeMode;
  if (THEME_COLORS.includes(color) && (mode === "light" || mode === "dark")) {
    return { color, mode };
  }
  return { color: DEFAULT_COLOR, mode: DEFAULT_MODE };
}

function applyTheme(color: ThemeColor, mode: ThemeMode) {
  const theme = `${color}-${mode}`;
  const el = document.documentElement;
  el.classList.add("theme-transitioning");
  el.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  setTimeout(() => el.classList.remove("theme-transitioning"), 300);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [color, setColorState] = useState<ThemeColor>(DEFAULT_COLOR);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);

  const colorRef = useRef<ThemeColor>(DEFAULT_COLOR);
  const modeRef = useRef<ThemeMode>(DEFAULT_MODE);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { color: c, mode: m } = parseTheme(stored);
        setColorState(c);
        setModeState(m);
        colorRef.current = c;
        modeRef.current = m;
      } else {
        const systemMode: ThemeMode = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches
          ? "dark"
          : "light";
        setModeState(systemMode);
        modeRef.current = systemMode;
        applyTheme(DEFAULT_COLOR, systemMode);
      }
    } catch {}
  }, []);

  const setColor = useCallback((c: ThemeColor) => {
    setColorState(c);
    colorRef.current = c;
    applyTheme(c, modeRef.current);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    modeRef.current = m;
    applyTheme(colorRef.current, m);
  }, []);

  const toggleMode = useCallback(() => {
    const next: ThemeMode = modeRef.current === "light" ? "dark" : "light";
    setMode(next);
  }, [setMode]);

  const resetTheme = useCallback(() => {
    setColorState(DEFAULT_COLOR);
    setModeState(DEFAULT_MODE);
    colorRef.current = DEFAULT_COLOR;
    modeRef.current = DEFAULT_MODE;
    applyTheme(DEFAULT_COLOR, DEFAULT_MODE);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        color,
        mode,
        theme: `${color}-${mode}`,
        setColor,
        setMode,
        toggleMode,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
