// イベント予約通知ヘルパー（Slack / Google Sheets / LINE push）
// Server Actions から fire-and-forget で呼び出す

import { google } from "googleapis";
import { logger } from "@/lib/logger";

export interface EventReservationNotificationPayload {
  candidateName: string;
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
    `${payload.candidateName}`,
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
  payload: EventReservationNotificationPayload
): Promise<void> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_EVENT_RESERVATION_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) return;

  const sheetName = process.env.GOOGLE_SHEETS_EVENT_RESERVATION_SHEET_NAME ?? "Sheet1";
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const row = [
    now,                                              // A: 予約日時
    payload.candidateName,                            // B: 氏名
    payload.email,                                    // C: メール
    payload.phone ? `'${payload.phone}` : "",         // D: 電話
    payload.schoolName,                               // E: 学校名
    String(payload.graduationYear),                   // F: 卒業年
    payload.eventTypeName,                            // G: イベントタイプ
    payload.eventDate,                                // H: イベント日
    `${payload.startTime}〜${payload.endTime}`,       // I: 時間
    payload.gatheringTime,                            // J: 集合時間
    payload.venueName,                                // K: 会場
    payload.venueAddress,                             // L: 住所
    payload.googleMapsUrl,                            // M: 地図URL
    payload.webConsultation ? "希望する" : "希望しない", // N: WEB相談
    payload.utmSource,                                // O: utm_source
    payload.utmMedium,                                // P: utm_medium
    payload.utmCampaign,                              // Q: utm_campaign
    payload.utmContent,                               // R: utm_content
    payload.utmTerm,                                  // S: utm_term
    payload.referrer,                                 // T: referrer
  ];

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  try {
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:T`,
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
