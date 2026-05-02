"use client";

import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "@/theme/ThemeProvider";

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
