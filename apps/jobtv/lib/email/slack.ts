// Slack Incoming Webhook 通知ユーティリティ
// SLACK_EMAIL_WEBHOOK_URL が未設定の場合はサイレントスキップ

import { logger } from "@/lib/logger";
import type { SignUpCandidatePayload } from "@/lib/types/signup";

export interface SlackEmailNotificationPayload {
  templateName: string;
  recipientEmail: string;
  subject: string;
  status: "sent" | "failed";
  errorMessage?: string;
  sendgridMessageId?: string | null;
}

export async function notifySlackEmailSent(
  payload: SlackEmailNotificationPayload
): Promise<void> {
  const webhookUrl = process.env.SLACK_EMAIL_WEBHOOK_URL;
  if (!webhookUrl) return;

  const icon  = payload.status === "sent" ? ":white_check_mark:" : ":x:";
  const color = payload.status === "sent" ? "#36a64f" : "#e01e5a";
  const statusLabel = payload.status === "sent" ? "送信成功" : "送信失敗";

  const fields = [
    { type: "mrkdwn", text: `*テンプレート:*\n\`${payload.templateName}\`` },
    { type: "mrkdwn", text: `*宛先:*\n${payload.recipientEmail}` },
    { type: "mrkdwn", text: `*件名:*\n${payload.subject}` },
    ...(payload.sendgridMessageId
      ? [{ type: "mrkdwn", text: `*Message ID:*\n${payload.sendgridMessageId}` }]
      : []),
    ...(payload.errorMessage
      ? [{ type: "mrkdwn", text: `*エラー:*\n${payload.errorMessage}` }]
      : []),
  ];

  const body = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${icon} *メール${statusLabel}*`,
            },
          },
          {
            type: "section",
            fields,
          },
        ],
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // Slack 通知の失敗はメール送付フローを止めない
    logger.error({ action: "notifySlackEmailSent", err: e }, "Slackメール通知の送信に失敗");
  }
}

export async function sendSignupSlackNotification(
  payload: SignUpCandidatePayload
): Promise<void> {
  const webhookUrl = process.env.SLACK_SIGNUP_WEBHOOK_URL;
  if (!webhookUrl) return;

  const now = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  const fullName = `${payload.last_name} ${payload.first_name}`;
  const fullNameKana = `${payload.last_name_kana} ${payload.first_name_kana}`;
  const school = [payload.school_name, payload.faculty_name, payload.department_name ? `- ${payload.department_name}` : ""].filter(Boolean).join(" ");

  const studentInfo = [
    `${fullName} (${fullNameKana})`,
    `Tel：${payload.phone || ""}`,
    `Mail：${payload.email}`,
    `学生情報：${payload.graduation_year}卒 ${payload.major_field || ""} ${payload.gender || ""}`,
    `学校：${school}${payload.school_type ? `  (${payload.school_type})` : ""}`,
    `志望業界：${payload.desired_industry?.join("、") || ""}`,
    `志望職種：${payload.desired_job_type?.join("、") || ""}`,
    `アカウントID：${payload.user_id ?? ""}`,
  ].join("\n");

  const utmInfo = [
    `utm_source：${payload.utm_source || ""}`,
    `utm_medium：${payload.utm_medium || ""}`,
    `utm_campaign：${payload.utm_campaign || ""}`,
    `utm_content：${payload.utm_content || ""}`,
    `utm_term：${payload.utm_term || ""}`,
    `utm_referrer：${payload.referrer || ""}`,
  ].join("\n");

  const text = `■ *新規会員登録* — ${now}\n\n*■学生情報*\n${studentInfo}\n\n*■登録情報*\n${utmInfo}`;

  const body = {
    username: "JOBTV新規会員登録通知",
    icon_emoji: ":tada:",
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
      const text = await res.text();
      logger.error({ action: "sendSignupSlackNotification", status: res.status, body: text }, "Slack会員登録通知がエラーを返しました");
    }
  } catch (e) {
    logger.error({ action: "sendSignupSlackNotification", err: e }, "Slack会員登録通知の送信に失敗");
  }
}
