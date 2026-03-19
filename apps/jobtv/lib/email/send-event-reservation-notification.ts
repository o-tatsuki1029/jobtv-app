// イベント予約通知ヘルパー（Slack / Google Sheets / LINE push）
// Server Actions から fire-and-forget で呼び出す
// 注意: イベントは admin が運営するものであり、recruiter への通知は行わない

import { google } from "googleapis";
import { logger } from "@/lib/logger";
import { ensureHeaders } from "@/lib/google/sheets";

const EVENT_RESERVATION_HEADERS = [
  // イベント予約情報
  "イベント予約ID", "予約日", "予約時刻",
  "イベントタイプID", "イベントタイプ名", "イベント日ID",
  "対象卒業年度", "エリア", "イベント日付",
  "集合時刻", "開始時刻", "終了時刻",
  // イベント予約UTM
  "予約utm_source", "予約utm_medium", "予約utm_campaign",
  "予約utm_content", "予約utm_term", "予約referrer",
  // 予約者情報（会員登録シートと同等）
  "会員登録日", "会員登録時刻", "アカウントID", "卒年度", "文理", "性別",
  "姓", "名", "セイ", "メイ", "携帯電話番号", "メールアドレス",
  "希望勤務地", "学校種別", "学校名", "志望業界", "志望職種",
  // 会員登録時UTM
  "登録utm_source", "登録utm_medium", "登録utm_campaign",
  "登録utm_content", "登録utm_term", "登録referrer",
];

export interface EventReservationNotificationPayload {
  candidateName: string;
  candidateNameKana: string;
  email: string;
  phone: string;
  graduationYear: number;
  schoolName: string;
  eventTypeName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  gatheringTime: string;
  venueAddress: string;
  googleMapsUrl: string;
  webConsultation: boolean;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
  referrer: string;
}

/** Sheets 転記専用の拡張ペイロード */
export interface EventReservationSheetPayload extends EventReservationNotificationPayload {
  reservationId: string;
  eventId: string;           // events.id（イベント日ID）
  eventTypeId: string;
  targetGraduationYear: number | null;
  area: string | null;
  // 予約者の詳細情報（会員登録シートと同等）
  userId: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  gender: string;
  desiredWorkLocation: string[];
  schoolType: string;
  majorField: string;
  desiredIndustry: string[];
  desiredJobType: string[];
  candidateCreatedAt: string;
  signupUtmSource: string;
  signupUtmMedium: string;
  signupUtmCampaign: string;
  signupUtmContent: string;
  signupUtmTerm: string;
  signupReferrer: string;
}

/**
 * イベント予約を Slack に通知する
 */
export async function sendEventReservationSlackNotification(
  payload: EventReservationNotificationPayload
): Promise<void> {
  const webhookUrl = process.env.SLACK_EVENT_RESERVATION_WEBHOOK_URL;
  if (!webhookUrl) return;

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const studentInfo = [
    `${payload.candidateName}${payload.candidateNameKana ? ` (${payload.candidateNameKana})` : ""}`,
    `Mail：${payload.email}`,
    `Tel：${payload.phone}`,
    `${payload.graduationYear}卒`,
    `学校：${payload.schoolName}`,
  ].join("\n");

  const eventInfo = [
    `イベント：${payload.eventTypeName}`,
    `日程：${payload.eventDate}`,
    `時間：${payload.startTime} 〜 ${payload.endTime}`,
    payload.gatheringTime ? `集合時間：${payload.gatheringTime}` : null,
    `会場：${payload.venueName}`,
    payload.venueAddress ? `住所：${payload.venueAddress}` : null,
    payload.googleMapsUrl ? `地図：${payload.googleMapsUrl}` : null,
    `WEB相談：${payload.webConsultation ? "希望する" : "希望しない"}`,
  ].filter(Boolean).join("\n");

  const utmInfo = [
    `utm_source：${payload.utmSource}`,
    `utm_medium：${payload.utmMedium}`,
    `utm_campaign：${payload.utmCampaign}`,
    `utm_content：${payload.utmContent}`,
    `utm_term：${payload.utmTerm}`,
    `referrer：${payload.referrer}`,
  ].join("\n");

  const text = `■ *イベント予約* — ${now}\n\n*■学生情報*\n${studentInfo}\n\n*■イベント情報*\n${eventInfo}\n\n*■流入情報*\n${utmInfo}`;

  const body = {
    username: "JOBTVイベント予約通知",
    icon_emoji: ":calendar:",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const resText = await res.text();
      logger.error(
        { action: "sendEventReservationSlackNotification", status: res.status, body: resText },
        "Slackイベント予約通知がエラーを返しました"
      );
    }
  } catch (e) {
    logger.error({ action: "sendEventReservationSlackNotification", err: e }, "Slackイベント予約通知の送信に失敗");
  }
}

/**
 * イベント予約を Google Sheets に追記する
 */
export async function appendEventReservationToSheet(
  payload: EventReservationSheetPayload
): Promise<void> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_EVENT_RESERVATION_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) return;

  const sheetName = process.env.GOOGLE_SHEETS_EVENT_RESERVATION_SHEET_NAME ?? "Sheet1";

  // 予約日時を日付・時刻に分割
  const jstNow = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
  const [reservationDate, reservationTimePart] = jstNow.split(" ");
  const reservationTime = (reservationTimePart ?? "")
    .split(":")
    .map((s) => s.padStart(2, "0"))
    .join(":");

  // 会員登録日時を日付・時刻に分割
  let candidateDate = "";
  let candidateTime = "";
  if (payload.candidateCreatedAt) {
    const d = new Date(payload.candidateCreatedAt);
    const jst = d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
    const [dp, tp] = jst.split(" ");
    candidateDate = dp ?? "";
    candidateTime = (tp ?? "").split(":").map((s) => s.padStart(2, "0")).join(":");
  }

  const row = [
    // ── イベント予約情報 ──
    payload.reservationId,                            // A: イベント予約ID
    reservationDate ?? "",                            // B: 予約日
    reservationTime,                                  // C: 予約時刻
    payload.eventTypeId,                              // D: イベントタイプID
    payload.eventTypeName,                            // E: イベントタイプ名
    payload.eventId,                                  // F: イベント日ID
    payload.targetGraduationYear != null ? String(payload.targetGraduationYear) : "", // G: 対象卒業年度
    payload.area ?? "",                               // H: エリア
    payload.eventDate,                                // I: イベント日付
    payload.gatheringTime,                            // J: 集合時刻
    payload.startTime,                                // K: 開始時刻
    payload.endTime,                                  // L: 終了時刻
    // ── イベント予約UTM ──
    payload.utmSource,                                // M: 予約utm_source
    payload.utmMedium,                                // N: 予約utm_medium
    payload.utmCampaign,                              // O: 予約utm_campaign
    payload.utmContent,                               // P: 予約utm_content
    payload.utmTerm,                                  // Q: 予約utm_term
    payload.referrer,                                 // R: 予約referrer
    // ── 予約者情報（会員登録シートと同等） ──
    candidateDate,                                    // S: 会員登録日
    candidateTime,                                    // T: 会員登録時刻
    payload.userId,                                   // U: アカウントID
    String(payload.graduationYear),                   // V: 卒年度
    payload.majorField,                               // W: 文理
    payload.gender,                                   // X: 性別
    payload.lastName,                                 // Y: 姓
    payload.firstName,                                // Z: 名
    payload.lastNameKana,                             // AA: セイ
    payload.firstNameKana,                            // AB: メイ
    payload.phone ? `'${payload.phone}` : "",         // AC: 携帯電話番号
    payload.email,                                    // AD: メールアドレス
    payload.desiredWorkLocation?.join("、") ?? "",      // AE: 希望勤務地
    payload.schoolType,                               // AF: 学校種別
    payload.schoolName,                               // AG: 学校名
    payload.desiredIndustry?.join("、") ?? "",         // AH: 志望業界
    payload.desiredJobType?.join("、") ?? "",          // AI: 志望職種
    // ── 会員登録時UTM ──
    payload.signupUtmSource,                           // AJ: 登録utm_source
    payload.signupUtmMedium,                           // AK: 登録utm_medium
    payload.signupUtmCampaign,                         // AL: 登録utm_campaign
    payload.signupUtmContent,                          // AM: 登録utm_content
    payload.signupUtmTerm,                             // AN: 登録utm_term
    payload.signupReferrer,                            // AO: 登録referrer
  ];

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  try {
    const sheetsApi = google.sheets({ version: "v4", auth });
    await ensureHeaders(sheetsApi, spreadsheetId, sheetName, EVENT_RESERVATION_HEADERS);
    await sheetsApi.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:AO`,  // 41列
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
  } catch (e) {
    logger.error({ action: "appendEventReservationToSheet", err: e }, "Google Sheetsへのイベント予約転記に失敗");
  }
}

/**
 * LINE push でイベント予約確認メッセージを送信する
 */
export async function sendEventReservationLinePush(
  lineUserId: string,
  event: {
    eventTypeName: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    venueName: string;
    gatheringTime?: string;
    venueAddress?: string;
    googleMapsUrl?: string;
  }
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return;

  const lines = [
    "【JOBTV】イベント予約が完了しました",
    "",
    `イベント: ${event.eventTypeName}`,
    `日程: ${event.eventDate}`,
    `時間: ${event.startTime} 〜 ${event.endTime}`,
  ];
  if (event.gatheringTime) lines.push(`集合時間: ${event.gatheringTime}`);
  lines.push(`会場: ${event.venueName}`);
  if (event.venueAddress) lines.push(`住所: ${event.venueAddress}`);
  if (event.googleMapsUrl) lines.push(`地図: ${event.googleMapsUrl}`);
  lines.push("", "当日お会いできることを楽しみにしております！");
  const text = lines.join("\n");

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error(
        { action: "sendEventReservationLinePush", status: res.status, body: errBody },
        "LINEイベント予約通知の送信に失敗"
      );
    }
  } catch (e) {
    logger.error({ action: "sendEventReservationLinePush", err: e }, "LINEイベント予約通知の送信に失敗");
  }
}
