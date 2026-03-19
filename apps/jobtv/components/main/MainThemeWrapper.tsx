"use client";

import { useEffect, type ReactNode } from "react";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

export default function MainThemeWrapper({ children }: { children: ReactNode }) {
  const { classes } = useMainTheme();

  // Suspense streaming 中にブラウザのスクロール復元が走ると
  // レイアウトシフトで勝手に下にスクロールされる問題を防止
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    // ハッシュ指定がなければ先頭に固定
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      {children}
    </div>
  );
}
