// メール送付オーケストレーター
// DB からテンプレート取得 → レンダリング → SendGrid 送信 → ログ記録 → Slack 通知
// サーバーサイド専用（Server Actions / Route Handler から呼ぶ）

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./sendgrid";
import { renderTemplate } from "./template-renderer";
import { notifySlackEmailSent } from "./slack";

export interface SendTemplatedEmailOptions {
  templateName: string;
  recipientEmail: string;
  variables: Record<string, string>;
}

export interface SendTemplatedEmailResult {
  data: { messageId: string | null } | null;
  error: string | null;
}

export async function sendTemplatedEmail(
  options: SendTemplatedEmailOptions
): Promise<SendTemplatedEmailResult> {
  const supabase = createAdminClient();

  // 1. DB からテンプレートを取得
  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("*")
    .eq("name", options.templateName)
    .eq("is_active", true)
    .single();

  if (templateError || !template) {
    const err = `メールテンプレートが見つかりません: ${options.templateName}`;
    console.error("[sendTemplatedEmail]", err);
    return { data: null, error: err };
  }

  // recipientEmail を変数に追加（テンプレート内で {recipient_email} として使用可能）
  const variables = {
    recipient_email: options.recipientEmail,
    ...options.variables,
  };

  // 2. テンプレートをレンダリング
  const renderedSubject = renderTemplate(template.subject,   variables);
  const renderedHtml    = renderTemplate(template.body_html, variables);
  const renderedText    = template.body_text
    ? renderTemplate(template.body_text, variables)
    : undefined;

  // 3. SendGrid で送信
  const sendResult = await sendEmail({
    to:          options.recipientEmail,
    subject:     renderedSubject,
    htmlContent: renderedHtml,
    textContent: renderedText,
  });

  const status: "sent" | "failed" = sendResult.error ? "failed" : "sent";

  // 4. email_logs に記録
  const { data: logRow, error: logError } = await supabase
    .from("email_logs")
    .insert({
      template_name:       options.templateName,
      recipient_email:     options.recipientEmail,
      subject:             renderedSubject,
      status,
      sendgrid_message_id: sendResult.messageId,
      error_message:       sendResult.error,
      variables_snapshot:  options.variables,
    })
    .select("id")
    .single();

  if (logError) {
    console.error("[sendTemplatedEmail] ログの記録に失敗:", logError);
  }

  // 5. Slack 通知
  let slackNotified = false;
  try {
    await notifySlackEmailSent({
      templateName:      options.templateName,
      recipientEmail:    options.recipientEmail,
      subject:           renderedSubject,
      status,
      errorMessage:      sendResult.error ?? undefined,
      sendgridMessageId: sendResult.messageId,
    });
    slackNotified = true;
  } catch {
    // Slack 失敗はサイレント
  }

  // slack_notified フラグを更新
  if (logRow?.id) {
    await supabase
      .from("email_logs")
      .update({ slack_notified: slackNotified })
      .eq("id", logRow.id);
  }

  if (status === "failed") {
    return { data: null, error: sendResult.error };
  }

  return { data: { messageId: sendResult.messageId }, error: null };
}
