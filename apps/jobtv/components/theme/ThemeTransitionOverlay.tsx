"use client";

import { Sun, Moon } from "lucide-react";
import type { MainTheme } from "@/constants/page-theme";

const DURATION_MS = 800;

interface ThemeTransitionOverlayProps {
  nextTheme: MainTheme;
}

/**
 * テーマ切り替え時に表示する楽しいロードオーバーレイ。
 * テーマは即時切り替わっているため、ちらつき防止のため短時間だけ表示する。
 */
export default function ThemeTransitionOverlay({ nextTheme }: ThemeTransitionOverlayProps) {
  const isToDark = nextTheme === "dark";
  const label = isToDark ? "ダークモードに切り替え中" : "ライトモードに切り替え中";
  const Icon = isToDark ? Moon : Sun;

  const overlayAnimation = isToDark ? "theme-overlay-to-dark" : "theme-overlay-to-light";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes theme-dot {
              from { transform: scale(0.8); opacity: 0.5; }
              to { transform: scale(1.2); opacity: 1; }
            }
            @keyframes theme-overlay-to-dark {
              from { background-color: rgba(0,0,0,0.2); backdrop-filter: blur(0); }
              to { background-color: rgba(0,0,0,0.72); backdrop-filter: blur(10px); }
            }
            @keyframes theme-overlay-to-light {
              from { background-color: rgba(0,0,0,0.72); backdrop-filter: blur(10px); }
              to { background-color: rgba(255,255,255,0.12); backdrop-filter: blur(6px); }
            }
          `
        }}
      />
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
        style={{
          animation: `${overlayAnimation} ${DURATION_MS}ms ease-in-out forwards`
        }}
        role="status"
        aria-live="polite"
        aria-label={label}
      >
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-gray-900/95 px-10 py-8 shadow-2xl">
          <div className="relative">
            <Icon
              className="h-16 w-16 text-amber-400 drop-shadow-lg animate-bounce"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="absolute -right-2 -top-2 flex h-5 w-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/40" />
              <span className="relative inline-flex h-5 w-5 rounded-full bg-amber-500" />
            </span>
          </div>
          <p className="text-lg font-semibold text-white">{label}</p>
          <div className="flex gap-1.5" aria-hidden>
            <span
              className="h-2 w-2 rounded-full bg-amber-400"
              style={{ animation: "theme-dot 0.6s ease-in-out 0s infinite alternate" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-amber-400"
              style={{ animation: "theme-dot 0.6s ease-in-out 0.2s infinite alternate" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-amber-400"
              style={{ animation: "theme-dot 0.6s ease-in-out 0.4s infinite alternate" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export { DURATION_MS };
