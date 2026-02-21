"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo
} from "react";
import type { MainTheme, MainThemeClasses } from "@/constants/company-page-theme";
import { MAIN_THEME_CLASSES } from "@/constants/company-page-theme";

const STORAGE_KEY = "main-theme";

interface MainThemeContextValue {
  theme: MainTheme;
  setTheme: (theme: MainTheme) => void;
  classes: MainThemeClasses;
  /** ヘッダーがある場合は true（通常ページ）。プレビューなどヘッダーなしの場合は false */
  hasHeader: boolean;
}

const MainThemeContext = createContext<MainThemeContextValue | null>(null);

interface MainThemeProviderProps {
  children: React.ReactNode;
  /** ヘッダーがあるレイアウトかどうか。プレビューページでは false */
  hasHeader?: boolean;
}

export function MainThemeProvider({ children, hasHeader = true }: MainThemeProviderProps) {
  const [theme, setThemeState] = useState<MainTheme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as MainTheme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: MainTheme) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const classes = useMemo(() => MAIN_THEME_CLASSES[theme], [theme]);

  const value = useMemo<MainThemeContextValue>(
    () => ({ theme, setTheme, classes, hasHeader }),
    [theme, setTheme, classes, hasHeader]
  );

  return (
    <MainThemeContext.Provider value={value}>{children}</MainThemeContext.Provider>
  );
}

export function useMainTheme(): MainThemeContextValue {
  const ctx = useContext(MainThemeContext);
  if (!ctx) {
    throw new Error("useMainTheme must be used within MainThemeProvider");
  }
  return ctx;
}
