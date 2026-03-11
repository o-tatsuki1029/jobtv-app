"use client";

import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { buildGoogleCalendarUrl } from "@/lib/utils/google-calendar";

const STATUS_LABELS: Record<string, string> = {
  reserved: "予約済み",
  cancelled: "キャンセル済み",
  attended: "参加済み"
};

interface EventReservationRow {
  id: string;
  status: string;
  web_consultation: boolean;
  created_at: string;
  events: {
    event_date: string;
    start_time: string;
    end_time: string;
    venue_name: string | null;
    display_name: string | null;
    gathering_time: string | null;
    venue_address: string | null;
    google_maps_url: string | null;
    status: string | null;
    event_types: {
      id: string;
      name: string;
      area: string | null;
    } | null;
  } | null;
}

interface EventReservationsViewProps {
  data: EventReservationRow[] | null;
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

function eventTypeBadgeClass(theme: string): string {
  return theme === "dark"
    ? "bg-red-900/40 text-red-300 border-red-800"
    : "bg-red-100 text-red-700 border-red-200";
}

function areaBadgeClass(theme: string): string {
  return theme === "dark"
    ? "bg-purple-900/40 text-purple-300 border-purple-800"
    : "bg-purple-100 text-purple-700 border-purple-200";
}

const DAY_OF_WEEK = ["日", "月", "火", "水", "木", "金", "土"] as const;

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "日程不明";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = DAY_OF_WEEK[d.getDay()];
  return `${y}年${m}月${day}日（${dow}）`;
}

function EventReservationCard({
  r,
  classes,
  theme,
  isUpcoming
}: {
  r: EventReservationRow;
  classes: ReturnType<typeof useMainTheme>["classes"];
  theme: string;
  isUpcoming: boolean;
}) {
  const event = r.events;
  const eventType = event?.event_types ?? null;
  const displayName = event?.display_name || eventType?.name || "";
  const eventDate = event?.event_date
    ? formatEventDate(event.event_date)
    : "日程不明";
  const startTime = event?.start_time?.slice(0, 5) ?? "";
  const endTime = event?.end_time?.slice(0, 5) ?? "";
  const gatheringTime = event?.gathering_time?.slice(0, 5) ?? "";
  const statusLabel = STATUS_LABELS[r.status] ?? r.status;
  const isEventCancelled = event?.status === "cancelled";
  const isPast = !isUpcoming && r.status !== "cancelled";
  const isCancelled = r.status === "cancelled";

  const timeDisplay = startTime
    ? `${startTime}〜${endTime}${gatheringTime ? `（集合 ${gatheringTime}）` : ""}`
    : "";

  const cardOpacity = isCancelled ? "opacity-60" : isPast ? "opacity-75" : "";

  const calendarUrl =
    isUpcoming && !isEventCancelled && event?.event_date && event.start_time && event.end_time
      ? buildGoogleCalendarUrl({
          title: displayName || "イベント",
          startDate: event.event_date,
          startTime: event.start_time.slice(0, 5),
          endTime: event.end_time.slice(0, 5),
          location: event.venue_address || event.venue_name || undefined,
          description: [
            gatheringTime ? `集合時間: ${gatheringTime}` : "",
            event.google_maps_url ? `地図: ${event.google_maps_url}` : "",
          ].filter(Boolean).join("\n") || undefined,
        })
      : null;

  return (
    <div className={cn("p-4 rounded-xl", classes.descriptionCardBg, classes.descriptionCardBorder, cardOpacity)}>
      {/* Badges row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {displayName && (
            <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded-full border", eventTypeBadgeClass(theme))}>
              {displayName}
            </span>
          )}
          {eventType?.area && (
            <span className={cn("inline-block text-xs font-medium px-2 py-0.5 rounded-full border", areaBadgeClass(theme))}>
              {eventType.area}
            </span>
          )}
          {isEventCancelled && (
            <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800">
              中止
            </span>
          )}
        </div>
        <span className={cn("shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border", statusBadgeClass(r.status, theme))}>
          {statusLabel}
        </span>
      </div>

      {/* Date & time zone */}
      <div className="space-y-1.5">
        <div className={cn("flex items-center gap-2 text-sm", classes.textPrimary)}>
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{eventDate}</span>
        </div>
        {timeDisplay && (
          <div className={cn("flex items-center gap-2 text-sm", classes.textPrimary)}>
            <Clock className="w-4 h-4 shrink-0" />
            <span>{timeDisplay}</span>
          </div>
        )}
      </div>

      {/* Venue zone */}
      {(event?.venue_name || event?.venue_address) && (
        <div className="mt-2.5">
          <div className={cn("flex items-start gap-2 text-sm", classes.textMuted)}>
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              {event.venue_name && <p>{event.venue_name}</p>}
              {event.venue_address && <p className="text-xs mt-0.5">{event.venue_address}</p>}
              {event.google_maps_url && (
                <a href={event.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-0.5 inline-block">
                  Googleマップで確認 &rarr;
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar link */}
      {calendarUrl && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4" />
            Googleカレンダーに追加
          </a>
        </div>
      )}
    </div>
  );
}

export default function EventReservationsView({ data, error }: EventReservationsViewProps) {
  const { classes, theme } = useMainTheme();

  const now = new Date();
  const reservations = data ?? [];

  const upcoming = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    const d = r.events?.event_date;
    return d ? new Date(d) >= now : false;
  });
  const past = reservations.filter((r) => {
    if (r.status === "cancelled") return false;
    const d = r.events?.event_date;
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
          <h1 className="text-xl font-bold">イベント予約一覧</h1>
        </div>

        {error ? (
          <div className="text-red-400 text-sm">{error}</div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-16">
            <p className={cn("mb-2", classes.textMuted)}>予約中のイベントはありません</p>
            <Link href="/event/entry" className="text-red-500 hover:text-red-400 text-sm">
              イベントを探す →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-3", classes.textMuted)}>今後の予約（{upcoming.length}件）</h2>
                <div className="space-y-3">
                  {upcoming.map((r) => <EventReservationCard key={r.id} r={r} classes={classes} theme={theme} isUpcoming />)}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-3", classes.textMuted)}>過去の予約（{past.length}件）</h2>
                <div className="space-y-3">
                  {past.map((r) => <EventReservationCard key={r.id} r={r} classes={classes} theme={theme} isUpcoming={false} />)}
                </div>
              </section>
            )}
            {cancelled.length > 0 && (
              <section>
                <h2 className={cn("text-sm font-semibold uppercase tracking-wider mb-3", classes.textMuted)}>キャンセル済み（{cancelled.length}件）</h2>
                <div className="space-y-3">
                  {cancelled.map((r) => <EventReservationCard key={r.id} r={r} classes={classes} theme={theme} isUpcoming={false} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
