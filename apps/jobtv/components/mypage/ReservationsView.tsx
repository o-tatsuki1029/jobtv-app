"use client";

import Link from "next/link";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

const STATUS_LABELS: Record<string, string> = {
  reserved: "予約済み",
  cancelled: "キャンセル済み",
  attended: "参加済み"
};

interface ReservationRow {
  id: string;
  status: string;
  attended: boolean;
  created_at: string;
  session_dates: {
    id: string;
    event_date: string;
    start_time: string;
    end_time: string;
    sessions: {
      id: string;
      title: string;
      companies: { id: string; name: string } | null;
    } | null;
  } | null;
}

interface ReservationsViewProps {
  data: ReservationRow[] | null;
  error: string | null;
}

function statusBadgeClass(status: string, theme: string): string {
  const map: Record<string, { light: string; dark: string }> = {
    reserved:  { light: "bg-blue-100 text-blue-700 border-blue-200",  dark: "bg-blue-900/40 text-blue-300 border-blue-800" },
    cancelled: { light: "bg-gray-100 text-gray-500 border-gray-200",  dark: "bg-gray-800 text-gray-400 border-gray-700" },
    attended:  { light: "bg-green-100 text-green-700 border-green-200", dark: "bg-green-900/40 text-green-300 border-green-800" }
  };
  const def = { light: "bg-gray-100 text-gray-500 border-gray-200", dark: "bg-gray-800 text-gray-400 border-gray-700" };
  return (map[status] ?? def)[theme === "dark" ? "dark" : "light"];
}

function ReservationCard({ r, classes, theme }: { r: ReservationRow; classes: ReturnType<typeof useMainTheme>["classes"]; theme: string }) {
  const session = r.session_dates?.sessions ?? null;
  const company = session?.companies ?? null;
  const eventDate = r.session_dates?.event_date
    ? new Date(r.session_dates.event_date).toLocaleDateString("ja-JP")
    : "日程不明";
  const startTime = r.session_dates?.start_time?.slice(0, 5) ?? "";
  const endTime = r.session_dates?.end_time?.slice(0, 5) ?? "";
  const statusLabel = STATUS_LABELS[r.status] ?? r.status;

  return (
    <div className={cn("p-4 rounded-xl", classes.descriptionCardBg, classes.descriptionCardBorder)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("font-semibold truncate", classes.textPrimary)}>{session?.title ?? "説明会名不明"}</p>
          <p className={cn("text-sm mt-0.5", classes.textSecondary)}>{company?.name ?? ""}</p>
          <p className={cn("text-xs mt-1", classes.textMuted)}>
            {eventDate}
            {startTime && ` ${startTime}〜${endTime}`}
          </p>
        </div>
        <span className={cn("shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border", statusBadgeClass(r.status, theme))}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}

export default function ReservationsView({ data, error }: ReservationsViewProps) {
  const { classes, theme } = useMainTheme();

  const now = new Date();
  const reservations = data ?? [];

  const upcoming = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    const d = r.session_dates?.event_date;
    return d ? new Date(d) >= now : false;
  });
  const past = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    const d = r.session_dates?.event_date;
    return d ? new Date(d) < now : true;
  });
  const cancelled = reservations.filter((r) => r.status === "cancelled");

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mypage" className={cn("transition-colors hover:opacity-80", classes.textMuted)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">説明会・インターン予約一覧</h1>
        </div>

        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-16">
            <p className={cn("mb-2", classes.textMuted)}>予約中のイベントはありません</p>
            <Link href="/" className="text-red-500 hover:text-red-400 text-sm">
              説明会を探す →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-3", classes.textMuted)}>今後の予約</h2>
                <div className="space-y-3">
                  {upcoming.map((r) => <ReservationCard key={r.id} r={r} classes={classes} theme={theme} />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-3", classes.textMuted)}>過去の予約</h2>
                <div className="space-y-3">
                  {past.map((r) => <ReservationCard key={r.id} r={r} classes={classes} theme={theme} />)}
                </div>
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-3", classes.textMuted)}>キャンセル済み</h2>
                <div className="space-y-3">
                  {cancelled.map((r) => <ReservationCard key={r.id} r={r} classes={classes} theme={theme} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
