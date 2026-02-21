"use client";

import { MapPin, Calendar, Users, Lightbulb } from "lucide-react";
import { useMainTheme } from "./CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

/** 企業ページ・求人/説明会詳細のサイドバーで共通表示する「設立〜本社所在地〜おすすめポイント」のブロック用 props */
export interface CompanyDetailsBlockProps {
  prefecture?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  established?: string | null;
  employees?: string | null;
  benefits?: string[] | null;
}

/**
 * 設立年月・従業員数・本社所在地・おすすめポイントを共通スタイルで表示するブロック。
 * 企業ページのサイドバー、求人詳細・説明会詳細のサイドバーで利用する。
 */
export default function CompanyDetailsBlock({
  prefecture,
  addressLine1,
  addressLine2,
  established,
  employees,
  benefits
}: CompanyDetailsBlockProps) {
  const { classes, theme } = useMainTheme();
  const hasAddress = !!(addressLine1 || addressLine2 || prefecture);
  const hasAny =
    hasAddress || !!established || !!employees || (Array.isArray(benefits) && benefits.length > 0);
  if (!hasAny) return null;

  return (
    <div className={cn("pt-6 md:pt-8 border-t", classes.sectionBorder)}>
      <ul className="space-y-2.5 text-sm">
        {established && (
          <li className={cn("flex gap-2 items-center", classes.textSecondary)}>
            <Calendar className="w-4 h-4 flex-shrink-0" aria-hidden />
            <span className="flex items-center gap-x-1.5">
              <span className={cn("text-xs font-medium", classes.textMuted)}>設立年月</span>
              <span>{established}</span>
            </span>
          </li>
        )}
        {employees && (
          <li className={cn("flex gap-2 items-center", classes.textSecondary)}>
            <Users className="w-4 h-4 flex-shrink-0" aria-hidden />
            <span className="flex items-center gap-x-1.5">
              <span className={cn("text-xs font-medium", classes.textMuted)}>従業員数</span>
              <span>{employees}</span>
            </span>
          </li>
        )}
        {hasAddress && (
          <li className={cn("flex gap-2 items-start", classes.textSecondary)}>
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
            <span className={cn("flex flex-wrap items-baseline gap-x-1.5", classes.textSecondary)}>
              <span className={cn("text-xs font-medium", classes.textMuted)}>本社所在地</span>
              <span className="break-words">
                {[prefecture, addressLine1, addressLine2].filter(Boolean).join(" ")}
              </span>
            </span>
          </li>
        )}
        {Array.isArray(benefits) && benefits.length > 0 && (
          <li className="flex gap-2 items-start">
            <Lightbulb className={cn("w-4 h-4 flex-shrink-0 mt-0.5", classes.textMuted)} aria-hidden />
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className={cn("text-xs font-medium", classes.textMuted)}>おすすめポイント</span>
              <div className="flex flex-wrap gap-1.5">
                {benefits.map((b, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border",
                      theme === "dark"
                        ? "bg-red-900/40 text-red-200 border-red-800"
                        : "bg-red-50 text-red-800 border-red-200"
                    )}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
}
