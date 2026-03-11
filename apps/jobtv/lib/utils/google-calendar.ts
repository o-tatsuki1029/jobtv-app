/**
 * Google カレンダー追加 URL を生成するユーティリティ
 */

interface GoogleCalendarParams {
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;
  location?: string;
  description?: string;
}

/**
 * Google Calendar の「予定を追加」URL を返す。
 * 日時は JST (Asia/Tokyo) として扱う。
 */
export function buildGoogleCalendarUrl(params: GoogleCalendarParams): string {
  const { title, startDate, startTime, endTime, location, description } = params;

  // YYYYMMDD + THHmmSS 形式（Google Calendar 用）
  const datePart = startDate.replace(/-/g, "");
  const start = `${datePart}T${startTime.replace(/:/g, "")}00`;
  const end = `${datePart}T${endTime.replace(/:/g, "")}00`;

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", `${start}/${end}`);
  url.searchParams.set("ctz", "Asia/Tokyo");
  if (location) url.searchParams.set("location", location);
  if (description) url.searchParams.set("details", description);

  return url.toString();
}
