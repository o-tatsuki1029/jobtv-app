// Google Sheets API 連携ユーティリティ
// 必要な環境変数が未設定の場合はサイレントスキップ

import { google, type sheets_v4 } from "googleapis";
import { logger } from "@/lib/logger";
import type { SignUpCandidatePayload } from "@/lib/types/signup";

const SIGNUP_HEADERS = [
  "会員登録日", "会員登録時刻", "アカウントID", "卒年度", "文理", "性別",
  "姓", "名", "セイ", "メイ", "携帯電話番号", "メールアドレス",
  "希望勤務地", "学校種別", "学校名", "志望業界", "志望職種",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "referrer",
];

/**
 * シートの1行目が空ならヘッダー行を挿入する（失敗してもデータ追記を止めない）
 */
export async function ensureHeaders(
  sheetsApi: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headers: string[],
): Promise<void> {
  try {
    const res = await sheetsApi.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:A1`,
    });
    const firstCell = res.data.values?.[0]?.[0];
    if (!firstCell) {
      await sheetsApi.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }
  } catch (e) {
    logger.error({ action: "ensureHeaders", err: e }, "ヘッダー自動挿入に失敗（データ追記は続行）");
  }
}

function buildRow(payload: SignUpCandidatePayload): string[] {
  const jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false });
  // "2026/3/18 14:05:30" → 日付部分と時刻部分に分割
  const [datePart, timePart] = jst.split(" ");
  // 時刻を hh:mm:ss にゼロ埋め
  const timeFormatted = (timePart ?? "")
    .split(":")
    .map((s) => s.padStart(2, "0"))
    .join(":");
  return [
    datePart ?? "",                                  // A: 会員登録日
    timeFormatted,                                   // B: 会員登録時刻
    payload.user_id ?? "",                           // C: アカウントID
    String(payload.graduation_year),                 // D: 卒年度
    payload.major_field,                             // E: 文理
    payload.gender,                                  // F: 性別
    payload.last_name,                               // G: 姓
    payload.first_name,                              // H: 名
    payload.last_name_kana,                          // I: セイ
    payload.first_name_kana,                         // J: メイ
    payload.phone ? `'${payload.phone}` : "",        // K: 携帯電話番号（先頭0保持のためテキスト強制）
    payload.email,                                   // L: メールアドレス
    payload.desired_work_location?.join("、") ?? "",  // M: 希望勤務地
    payload.school_type,                             // N: 学校種別
    payload.school_name,                             // O: 学校名
    payload.desired_industry?.join("、") ?? "",      // P: 志望業界
    payload.desired_job_type?.join("、") ?? "",      // Q: 志望職種
    payload.utm_source ?? "",                        // R: utm_source
    payload.utm_medium ?? "",                        // S: utm_medium
    payload.utm_campaign ?? "",                      // T: utm_campaign
    payload.utm_content ?? "",                       // U: utm_content
    payload.utm_term ?? "",                          // V: utm_term
    payload.referrer ?? "",                          // W: referrer
  ];
}

export async function appendCandidateToSheet(
  payload: SignUpCandidatePayload
): Promise<void> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) return;

  const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME ?? "Sheet1";

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  try {
    const sheetsApi = google.sheets({ version: "v4", auth });
    await ensureHeaders(sheetsApi, spreadsheetId, sheetName, SIGNUP_HEADERS);
    await sheetsApi.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:W`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [buildRow(payload)] },
    });
  } catch (e) {
    logger.error({ action: "appendCandidateToSheet", err: e }, "Google Sheetsへの転記に失敗");
  }
}
