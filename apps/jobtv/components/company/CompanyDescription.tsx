"use client";

import { useState, useRef, useEffect } from "react";
import type { CompanyData } from "./types";
import { useMainTheme } from "./CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyDescriptionProps {
  company: CompanyData;
}

/** 省略表示時の最大行数（この行数を超えると「もっと見る」を表示） */
const MAX_LINES = 4;

export default function CompanyDescription({ company }: CompanyDescriptionProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const { classes } = useMainTheme();

  // 4行を超えるかどうかを検知（line-clamp 適用時の scrollHeight と clientHeight で判定）
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !company.description) return;
    if (isDescriptionExpanded) {
      setHasOverflow(true);
      return;
    }
    const check = () => setHasOverflow(el.scrollHeight > el.clientHeight);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [company.description, isDescriptionExpanded]);

  if (!company.tagline && !company.description) {
    return null;
  }

  const showMoreButton = hasOverflow;
  const applyLineClamp = !isDescriptionExpanded;
  const isCollapsed = showMoreButton && !isDescriptionExpanded;

  return (
    <section
      role={isCollapsed ? "button" : undefined}
      tabIndex={isCollapsed ? 0 : undefined}
      onKeyDown={isCollapsed ? (e) => e.key === "Enter" && setIsDescriptionExpanded(true) : undefined}
      onClick={isCollapsed ? () => setIsDescriptionExpanded(true) : undefined}
      className={cn(
        "rounded-lg p-5 md:p-8 transition-colors",
        classes.descriptionCardBorder,
        isCollapsed ? ["cursor-pointer", classes.descriptionCardBg, classes.descriptionCardHover] : classes.descriptionCardBg
      )}
    >
      {company.tagline && (
        <h2 className={cn("text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2", classes.textPrimary)}>
          <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
          {company.tagline}
        </h2>
      )}
      {company.description && (
        <>
          <p
            ref={contentRef}
            className={cn(
              "leading-relaxed text-base md:text-lg whitespace-pre-wrap",
              classes.textSecondary,
              applyLineClamp ? "line-clamp-4" : ""
            )}
          >
            {company.description}
          </p>
          {showMoreButton && (
            <div className="mt-4">
              {isDescriptionExpanded ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDescriptionExpanded(false);
                  }}
                  className="text-red-500 hover:text-red-400 font-semibold text-sm md:text-base transition-colors flex items-center gap-1.5"
                >
                  閉じる
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              ) : (
                <span className="text-red-500 font-semibold text-sm md:text-base flex items-center gap-1.5">
                  もっと見る
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
