// Google Sheets API 連携ユーティリティ
// 必要な環境変数が未設定の場合はサイレントスキップ

import { google } from "googleapis";
import { logger } from "@/lib/logger";
import type { SignUpCandidatePayload } from "@/lib/types/signup";

function buildRow(payload: SignUpCandidatePayload): string[] {
  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  return [
    now,                                             // A: 登録日時
    payload.user_id ?? "",                           // B: アカウントID
    String(payload.graduation_year),                 // C: 卒年度
    payload.major_field,                             // D: 文理
    payload.gender,                                  // E: 性別
    payload.last_name,                               // F: 姓
    payload.first_name,                              // G: 名
    payload.last_name_kana,                          // H: セイ
    payload.first_name_kana,                         // I: メイ
    payload.phone ? `'${payload.phone}` : "",        // J: 携帯電話番号（先頭0保持のためテキスト強制）
    payload.email,                                   // K: メールアドレス
    payload.desired_work_location,                   // L: 都道府県
    payload.date_of_birth,                           // M: 生年月日
    payload.school_type,                             // N: 学校種別
    payload.school_name,                             // O: 学校名
    payload.faculty_name,                            // P: 学部名
    payload.department_name,                         // Q: 学科名
    payload.desired_industry?.join("、") ?? "",      // R: 志望業界
    payload.desired_job_type?.join("、") ?? "",      // S: 志望職種
    payload.utm_source ?? "",                        // T: utm_source
    payload.utm_medium ?? "",                        // U: utm_medium
    payload.utm_campaign ?? "",                      // V: utm_campaign
    payload.utm_content ?? "",                       // W: utm_content
    payload.utm_term ?? "",                          // X: utm_term
    payload.referrer ?? "",                          // Y: referrer
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
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:X`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [buildRow(payload)] },
    });
  } catch (e) {
    logger.error({ action: "appendCandidateToSheet", err: e }, "Google Sheetsへの転記に失敗");
  }
}
