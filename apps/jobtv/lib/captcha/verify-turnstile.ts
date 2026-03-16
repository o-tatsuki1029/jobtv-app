/**
 * Cloudflare Turnstile トークンをサーバーサイドで手動検証する。
 * Supabase Auth を経由しない Server Action（createReservationForExistingCandidate）で使用。
 */
export async function verifyTurnstileToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { success: false, error: "Turnstile secret key is not configured" };
  }

  if (!token) {
    return { success: false, error: "CAPTCHA トークンが見つかりません。ページを再読み込みしてお試しください。" };
  }

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      }
    );

    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      return {
        success: false,
        error: "CAPTCHA の検証に失敗しました。ページを再読み込みしてお試しください。",
      };
    }

    return { success: true };
  } catch {
    return {
      success: false,
      error: "CAPTCHA の検証中にエラーが発生しました。しばらく経ってからお試しください。",
    };
  }
}
