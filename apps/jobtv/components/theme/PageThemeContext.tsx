"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo
} from "react";
import type { MainTheme, MainThemeClasses } from "@/constants/page-theme";
import { MAIN_THEME_CLASSES } from "@/constants/page-theme";
import ThemeTransitionOverlay, { DURATION_MS } from "./ThemeTransitionOverlay";

const STORAGE_KEY = "main-theme";

interface MainThemeContextValue {
  theme: MainTheme;
  setTheme: (theme: MainTheme) => void;
  classes: MainThemeClasses;
  /** ヘッダーがある場合は true（通常ページ）。プレビューなどヘッダーなしの場合は false */
  hasHeader: boolean;
  /** テーマ切り替えオーバーレイ表示中は true。この間はトグル操作を受け付けない */
  isTransitioning: boolean;
}

export const MainThemeContext = createContext<MainThemeContextValue | null>(null);

interface MainThemeProviderProps {
  children: React.ReactNode;
  /** ヘッダーがあるレイアウトかどうか。プレビューページでは false */
  hasHeader?: boolean;
}

export function MainThemeProvider({ children, hasHeader = true }: MainThemeProviderProps) {
  const [theme, setThemeState] = useState<MainTheme>("light");
  const [mounted, setMounted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayTheme, setOverlayTheme] = useState<MainTheme | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as MainTheme | null;
    if (stored === "light" || stored === "dark") {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const setTheme = useCallback((next: MainTheme) => {
    setThemeState((current) => {
      if (current === next) return current;
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, next);
      }
      setOverlayTheme(next);
      setShowOverlay(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
        setOverlayTheme(null);
        timeoutRef.current = null;
      }, DURATION_MS);
      return next;
    });
  }, []);

  const classes = useMemo(() => MAIN_THEME_CLASSES[theme], [theme]);

  const value = useMemo<MainThemeContextValue>(
    () => ({ theme, setTheme, classes, hasHeader, isTransitioning: showOverlay }),
    [theme, setTheme, classes, hasHeader, showOverlay]
  );

  return (
    <MainThemeContext.Provider value={value}>
      {children}
      {showOverlay && overlayTheme && hasHeader && (
        <ThemeTransitionOverlay nextTheme={overlayTheme} />
      )}
    </MainThemeContext.Provider>
  );
}

export function useMainTheme(): MainThemeContextValue {
  const ctx = useContext(MainThemeContext);
  if (!ctx) {
    throw new Error("useMainTheme must be used within MainThemeProvider");
  }
  return ctx;
}
