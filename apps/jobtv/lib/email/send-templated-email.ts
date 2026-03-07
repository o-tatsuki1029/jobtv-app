// メール送付オーケストレーター
// DB からテンプレート取得 → レンダリング → SendGrid 送信 → ログ記録 → Slack 通知
// サーバーサイド専用（Server Actions / Route Handler から呼ぶ）

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./sendgrid";
import { renderTemplate } from "./template-renderer";
import { notifySlackEmailSent } from "./slack";
import { SITE_URL } from "@/constants/site";

const LINE_CTA_HTML = `<div style="background:#f0fff4;border:1px solid #06C755;border-radius:8px;padding:16px 20px;margin:24px 0;">
  <p style="margin:0 0 8px;font-weight:bold;color:#222;">LINEと連携して就活情報をいち早くゲット！</p>
  <p style="margin:0 0 12px;font-size:14px;color:#555;">企業からの新着求人・説明会情報をLINEでお知らせします。</p>
  <a href="${SITE_URL}/settings/line" style="background:#06C755;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold;">LINEと連携する</a>
</div>`;

const LINE_CTA_TEXT = `\n------------------------------------------------------------\n■ LINEと連携して就活情報をいち早くゲット！\n企業からの新着求人・説明会情報をLINEでお知らせします。\nLINEと連携する: ${SITE_URL}/settings/line\n------------------------------------------------------------\n`;

export interface SendTemplatedEmailOptions {
  templateName: string;
  recipientEmail: string;
  variables: Record<string, string>;
  /** candidate の場合、HTML/テキストに LINE CTA を挿入する */
  recipientRole?: string;
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
  let renderedHtml      = renderTemplate(template.body_html, variables);
  let renderedText      = template.body_text
    ? renderTemplate(template.body_text, variables)
    : undefined;

  // 候補者向けメールには LINE CTA を挿入する
  if (options.recipientRole === "candidate") {
    renderedHtml = renderedHtml.includes("<hr")
      ? renderedHtml.replace("<hr", LINE_CTA_HTML + "<hr")
      : renderedHtml + LINE_CTA_HTML;
    if (renderedText) {
      renderedText = renderedText + LINE_CTA_TEXT;
    }
  }

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
