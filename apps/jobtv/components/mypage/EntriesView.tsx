"use client";

import Link from "next/link";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

const STATUS_LABELS: Record<string, string> = {
  applied: "エントリー済み",
  screening: "書類選考中",
  interview: "面接中",
  offered: "内定",
  declined: "辞退",
  rejected: "不合格"
};

interface ApplicationRow {
  id: string;
  current_status: string;
  created_at: string;
  job_postings: {
    id: string;
    title: string;
    graduation_year: number | null;
    companies: { id: string; name: string; logo_url: string | null } | null;
  } | null;
}

interface EntriesViewProps {
  data: ApplicationRow[] | null;
  error: string | null;
}

function statusBadgeClass(status: string, theme: string): string {
  const map: Record<string, { light: string; dark: string }> = {
    applied:   { light: "bg-blue-100 text-blue-700 border-blue-200",   dark: "bg-blue-900/40 text-blue-300 border-blue-800" },
    screening: { light: "bg-yellow-100 text-yellow-700 border-yellow-200", dark: "bg-yellow-900/40 text-yellow-300 border-yellow-800" },
    interview: { light: "bg-purple-100 text-purple-700 border-purple-200", dark: "bg-purple-900/40 text-purple-300 border-purple-800" },
    offered:   { light: "bg-green-100 text-green-700 border-green-200",  dark: "bg-green-900/40 text-green-300 border-green-800" },
    declined:  { light: "bg-gray-100 text-gray-500 border-gray-200",    dark: "bg-gray-800 text-gray-400 border-gray-700" },
    rejected:  { light: "bg-red-100 text-red-600 border-red-200",       dark: "bg-red-900/40 text-red-400 border-red-800" }
  };
  const def = { light: "bg-gray-100 text-gray-500 border-gray-200", dark: "bg-gray-800 text-gray-400 border-gray-700" };
  return (map[status] ?? def)[theme === "dark" ? "dark" : "light"];
}

export default function EntriesView({ data, error }: EntriesViewProps) {
  const { classes, theme } = useMainTheme();

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mypage" className={cn("transition-colors hover:opacity-80", classes.textMuted)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">エントリー中の企業</h1>
        </div>

        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-16">
            <p className={cn("mb-2", classes.textMuted)}>エントリー中の企業はありません</p>
            <Link href="/" className="text-red-500 hover:text-red-400 text-sm">
              求人を探す →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((app) => {
              const company = app.job_postings?.companies ?? null;
              const statusLabel = STATUS_LABELS[app.current_status] ?? app.current_status;
              const createdDate = new Date(app.created_at).toLocaleDateString("ja-JP");

              return (
                <div
                  key={app.id}
                  className={cn(
                    "p-4 rounded-xl",
                    classes.descriptionCardBg,
                    classes.descriptionCardBorder
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("font-semibold truncate", classes.textPrimary)}>{company?.name ?? "企業名不明"}</p>
                      <p className={cn("text-sm mt-0.5 truncate", classes.textSecondary)}>{app.job_postings?.title ?? "求人タイトル不明"}</p>
                      <p className={cn("text-xs mt-1", classes.textMuted)}>エントリー日: {createdDate}</p>
                    </div>
                    <span className={cn("shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border", statusBadgeClass(app.current_status, theme))}>
                      {statusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
