// Slack Incoming Webhook 通知ユーティリティ
// SLACK_EMAIL_WEBHOOK_URL が未設定の場合はサイレントスキップ

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
    console.error("[Slack] メール通知の送信に失敗:", e);
  }
}
