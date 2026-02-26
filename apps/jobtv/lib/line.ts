/**
 * LINE Login: code を access_token に交換し、プロフィールから userId を取得する。
 * コールバック API から使用。サーバー専用（client_id/secret を使用）。
 */
export async function exchangeCodeForLineUserId(
  code: string,
  redirectUri: string
): Promise<{ userId: string } | { error: string }> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  const clientSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;

  if (!clientId || !clientSecret) {
    console.error("LINE_LOGIN_CHANNEL_ID or LINE_LOGIN_CHANNEL_SECRET is not set");
    return { error: "LINE 連携の設定がありません。" };
  }

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error("LINE token exchange error:", tokenRes.status, errBody);
    return { error: "LINE 認証に失敗しました。もう一度お試しください。" };
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };

  const accessToken = tokenData.access_token;
  if (!accessToken) {
    console.error("LINE token response missing access_token");
    return { error: "LINE 認証に失敗しました。" };
  }

  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!profileRes.ok) {
    const errBody = await profileRes.text();
    console.error("LINE profile error:", profileRes.status, errBody);
    return { error: "LINE プロフィールの取得に失敗しました。" };
  }

  const profile = (await profileRes.json()) as { userId?: string };
  const userId = profile.userId;
  if (!userId) {
    console.error("LINE profile missing userId");
    return { error: "LINE ユーザー情報の取得に失敗しました。" };
  }

  return { userId };
}

/** LINE Login コールバックの redirect_uri（認証リクエストと token 交換で同一である必要あり） */
export function getLineCallbackRedirectUri(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${baseUrl.replace(/\/$/, "")}/api/line/callback`;
}

/**
 * LINE Login の認証 URL を組み立てる（リダイレクト用）。
 */
export function buildLineLoginUrl(state: string): string {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) {
    throw new Error("LINE_LOGIN_CHANNEL_ID is not set");
  }
  const redirectUri = getLineCallbackRedirectUri();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid"
  });

  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}
