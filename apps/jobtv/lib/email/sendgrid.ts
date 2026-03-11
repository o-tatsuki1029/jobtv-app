// SendGrid v3 REST API を直接呼び出すユーティリティ
// npm パッケージ不要。サーバーサイド専用（Server Actions / Route Handler から呼ぶ）

const SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send";

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface SendEmailResult {
  messageId: string | null;
  error: string | null;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    return { messageId: null, error: "SENDGRID_API_KEY が設定されていません" };
  }

  const fromEmail = options.fromEmail ?? process.env.SENDGRID_FROM_EMAIL ?? "noreply@jobtv.jp";
  const fromName  = options.fromName  ?? process.env.SENDGRID_FROM_NAME  ?? "JOBTV";

  const payload = {
    personalizations: [{ to: [{ email: options.to }] }],
    from: { email: fromEmail, name: fromName },
    subject: options.subject,
    content: [
      ...(options.textContent ? [{ type: "text/plain", value: options.textContent }] : []),
      { type: "text/html", value: options.htmlContent },
    ],
  };

  try {
    const res = await fetch(SENDGRID_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return { messageId: null, error: `SendGrid エラー ${res.status}: ${body}` };
    }

    const messageId = res.headers.get("X-Message-Id") ?? null;
    return { messageId, error: null };
  } catch (e) {
    return {
      messageId: null,
      error: e instanceof Error ? e.message : "SendGrid への接続に失敗しました",
    };
  }
}
