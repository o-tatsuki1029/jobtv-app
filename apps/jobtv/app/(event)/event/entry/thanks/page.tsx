import { createAdminClient } from "@/lib/supabase/admin";
import { buildGoogleCalendarUrl } from "@/lib/utils/google-calendar";
import { getHeaderAuthInfo } from "@/lib/actions/auth-actions";
import { getLineLinkStatus } from "@/lib/actions/line-actions";
import Link from "next/link";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EventEntryThanksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const eventId = typeof sp.event_id === "string" ? sp.event_id : "";

  let eventDetail: {
    eventTypeName: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    venueName: string;
    gatheringTime: string;
    venueAddress: string;
    googleMapsUrl: string;
  } | null = null;

  if (eventId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("events")
      .select("event_date, start_time, end_time, venue_name, display_name, gathering_time, venue_address, google_maps_url, event_types(name)")
      .eq("id", eventId)
      .single();

    if (data) {
      const eventType = Array.isArray(data.event_types) ? data.event_types[0] : data.event_types;
      eventDetail = {
        eventTypeName: data.display_name || eventType?.name || "",
        eventDate: data.event_date,
        startTime: data.start_time,
        endTime: data.end_time,
        venueName: data.venue_name ?? "",
        gatheringTime: data.gathering_time ? data.gathering_time.slice(0, 5) : "",
        venueAddress: data.venue_address ?? "",
        googleMapsUrl: data.google_maps_url ?? "",
      };
    }
  }

  // ログイン済み candidate かつ LINE 連携済みか判定
  const authResult = await getHeaderAuthInfo();
  const authData = authResult.error ? null : authResult.data;
  const isLoggedIn = !!authData?.user;
  const isStudioUser = authData?.role === "recruiter" || authData?.role === "admin";
  const isLoggedInCandidate = isLoggedIn && !isStudioUser;

  let isLineLinked = false;
  if (isLoggedInCandidate) {
    const lineResult = await getLineLinkStatus();
    isLineLinked = lineResult.data?.linked ?? false;
  }

  const calendarUrl = eventDetail
    ? buildGoogleCalendarUrl({
        title: `【JOBTV】${eventDetail.eventTypeName}`,
        startDate: eventDetail.eventDate,
        startTime: eventDetail.startTime,
        endTime: eventDetail.endTime,
        location: eventDetail.venueAddress || eventDetail.venueName,
        description: [
          "JOBTVイベント予約",
          eventDetail.gatheringTime ? `集合時間: ${eventDetail.gatheringTime}` : "",
          eventDetail.googleMapsUrl ? `地図: ${eventDetail.googleMapsUrl}` : "",
        ].filter(Boolean).join("\n"),
      })
    : null;

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00+09:00");
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = weekdays[d.getDay()];
    return `${d.getFullYear()}年${month}月${day}日(${weekday})`;
  }

  function formatTime(time: string): string {
    return time.slice(0, 5);
  }

  return (
    <div className="flex items-center justify-center px-2 py-20 sm:px-4 bg-white">
      <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 text-center max-sm:border-0 max-sm:rounded-none">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">予約が完了しました！</h1>
        <p className="text-gray-600 mb-6">ご予約ありがとうございます。</p>

        {eventDetail && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-6 text-left text-sm">
            <div className="space-y-1.5">
              {eventDetail.eventTypeName && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-20 shrink-0">イベント</span>
                  <span className="text-gray-900">{eventDetail.eventTypeName}</span>
                </div>
              )}
              <div className="flex">
                <span className="font-medium text-gray-700 w-20 shrink-0">日程</span>
                <span className="text-gray-900">{formatDate(eventDetail.eventDate)}</span>
              </div>
              <div className="flex">
                <span className="font-medium text-gray-700 w-20 shrink-0">時間</span>
                <span className="text-gray-900">{formatTime(eventDetail.startTime)} 〜 {formatTime(eventDetail.endTime)}</span>
              </div>
              {eventDetail.gatheringTime && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-20 shrink-0">集合時間</span>
                  <span className="text-gray-900">{eventDetail.gatheringTime}</span>
                </div>
              )}
              {eventDetail.venueName && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-20 shrink-0">会場</span>
                  <span className="text-gray-900">{eventDetail.venueName}</span>
                </div>
              )}
              {eventDetail.venueAddress && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-20 shrink-0">住所</span>
                  <span className="text-gray-900">{eventDetail.venueAddress}</span>
                </div>
              )}
              {eventDetail.googleMapsUrl && (
                <div className="flex">
                  <span className="font-medium text-gray-700 w-20 shrink-0">地図</span>
                  <a href={eventDetail.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                    Googleマップで確認
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {calendarUrl && (
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto mb-6 flex w-fit items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Googleカレンダーに追加
          </a>
        )}

        {!isLoggedIn ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-center">
            <p className="mb-1 font-bold text-gray-900">ログインして予約を管理</p>
            <p className="mb-4 text-sm text-gray-600">
              ログインすると予約の確認やリマインド通知を受け取れます。
            </p>
            <Link
              href="/auth/login"
              className="mx-auto flex w-fit items-center justify-center rounded-md bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600"
            >
              ログインする
            </Link>
          </div>
        ) : isLoggedInCandidate && isLineLinked ? (
          <Link
            href="/mypage/event-reservations"
            className="mx-auto flex w-fit items-center justify-center rounded-md bg-red-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600"
          >
            予約一覧を確認する
          </Link>
        ) : isLoggedInCandidate && !isLineLinked ? (
          <div className="rounded-lg border border-[#06C755] bg-[#f0fff4] p-5 text-center">
            <p className="mb-1 font-bold text-gray-900">LINE連携をお願いします</p>
            <p className="mb-4 text-sm text-gray-600">
              イベントのリマインドやお知らせをLINEで受け取れます。
            </p>
            <a
              href="/api/line/authorize"
              className="mx-auto flex w-fit items-center justify-center rounded-md bg-[#06C755] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#05b34d]"
            >
              LINEと連携する
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
