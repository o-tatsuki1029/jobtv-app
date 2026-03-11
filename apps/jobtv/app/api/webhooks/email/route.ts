// Supabase Auth Send Email Hook エンドポイント
// Supabase がメールを送る代わりにこの endpoint を呼び出す。
// 対象: signup（メール確認）、recovery（パスワードリセット）
//
// 設定:
//   ローカル: supabase/config.toml の [auth.hook.send_email] を参照
//   本番: Supabase Dashboard → Authentication → Hooks で設定

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";
import { logger } from "@/lib/logger";

// Standard Webhooks 形式の署名検証
// Supabase は HMAC-SHA256 を "{webhook-id}.{webhook-timestamp}.{body}" で計算し
// "v1,<base64>" 形式で webhook-signature ヘッダーに付与する
function verifyHookSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  webhookSignature: string
): boolean {
  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (!secret) {
    console.warn("[EmailHook] SUPABASE_HOOK_SECRET が未設定です");
    return false;
  }

  // "v1,whsec_<base64>" から base64 部分を取り出しデコード
  const match = secret.match(/whsec_(.+)$/);
  if (!match) {
    console.warn("[EmailHook] SUPABASE_HOOK_SECRET のフォーマットが不正です（v1,whsec_<base64> 形式で設定してください）");
    return false;
  }
  const keyBytes = Buffer.from(match[1], "base64");

  // signed content: "{id}.{timestamp}.{body}"
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expectedHmac  = createHmac("sha256", keyBytes).update(signedContent).digest("base64");
  const expected      = `v1,${expectedHmac}`;

  // ヘッダーにはスペース区切りで複数の署名が入ることがある
  return webhookSignature.split(" ").some((sig) => {
    try {
      if (sig.length !== expected.length) return false;
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

interface HookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, string>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

const TEMPLATE_MAP: Record<string, string> = {
  signup:   "signup_confirmation",
  recovery: "password_reset",
};

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Standard Webhooks のヘッダー
  const webhookId        = request.headers.get("webhook-id")        ?? "";
  const webhookTimestamp = request.headers.get("webhook-timestamp")  ?? "";
  const webhookSignature = request.headers.get("webhook-signature")  ?? "";

  if (!verifyHookSignature(rawBody, webhookId, webhookTimestamp, webhookSignature)) {
    logger.error({ action: "POST", hook: "email" }, "署名の検証に失敗しました");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user, email_data } = payload;
  const emailActionType = email_data?.email_action_type ?? "";
  const recipientEmail  = user?.email ?? "";

  if (!recipientEmail) {
    return NextResponse.json({ error: "メールアドレスがありません" }, { status: 400 });
  }

  const templateName = TEMPLATE_MAP[emailActionType];
  if (!templateName) {
    // 未対応のタイプは透過（Supabase のデフォルト動作を妨げない）
    console.warn(`[EmailHook] 未対応の email_action_type: ${emailActionType} — スキップ`);
    return NextResponse.json({});
  }

  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? email_data.site_url ?? "";
  const tokenHash  = email_data.token_hash ?? "";
  const token      = email_data.token ?? "";

  // confirm_url の組み立て
  // recovery の場合、redirect_to があればそのパスを使う（recruiter は /studio/update-password を渡す）
  const recoveryPath = email_data.redirect_to || `${siteUrl}/auth/update-password`;
  const confirmUrl =
    emailActionType === "signup"
      ? `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=signup&next=/`
      : `${recoveryPath}?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

  const variables: Record<string, string> = {
    confirm_url: confirmUrl,
    token,
    site_url:    siteUrl,
    ...(user.user_metadata?.first_name ? { first_name: user.user_metadata.first_name } : {}),
    ...(user.user_metadata?.last_name  ? { last_name:  user.user_metadata.last_name  } : {}),
  };

  const { error } = await sendTemplatedEmail({
    templateName,
    recipientEmail,
    variables,
  });

  if (error) {
    logger.error({ action: "POST", hook: "email", emailActionType, err: error }, "テンプレートメール送信に失敗しました");
    // 500 を返すと Supabase がリトライする
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({});
}
