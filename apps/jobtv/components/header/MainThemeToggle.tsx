"use client";

import { Sun, Moon } from "lucide-react";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

/**
 * (main) ページ用のライト/ダークテーマ切替ボタン。
 * MainThemeProvider 内でのみ使用する。
 */
export default function MainThemeToggle() {
  const { theme, setTheme, isTransitioning } = useMainTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => !isTransitioning && setTheme(isLight ? "dark" : "light")}
      disabled={isTransitioning}
      aria-label={isLight ? "ダークモードに切り替え" : "ライトモードに切り替え"}
      aria-busy={isTransitioning}
      className={cn(
        "p-2 rounded-md transition-colors",
        "text-white hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black",
        isTransitioning && "pointer-events-none opacity-50 cursor-not-allowed"
      )}
    >
      {isLight ? (
        <Moon className="w-5 h-5" aria-hidden />
      ) : (
        <Sun className="w-5 h-5" aria-hidden />
      )}
    </button>
  );
}
