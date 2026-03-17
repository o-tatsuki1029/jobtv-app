import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForLineUserId, getLineCallbackRedirectUri } from "@/lib/line";
import { logger } from "@/lib/logger";

const LINE_LINK_STATE_COOKIE = "line_link_state";
const MYPAGE_PATH = "/mypage";

function redirectToMypage(searchParams: URLSearchParams = new URLSearchParams()) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const q = searchParams.toString();
  const path = q ? `${MYPAGE_PATH}?${q}` : MYPAGE_PATH;
  return NextResponse.redirect(new URL(path, base));
}

/**
 * LINE Login コールバック: code を userId に交換し、ログイン中の candidate に line_user_id を保存する。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return redirectToMypage(new URLSearchParams({ error: "invalid_callback" }));
  }

  const savedState = request.cookies.get(LINE_LINK_STATE_COOKIE)?.value;
  if (!savedState || savedState !== state) {
    return redirectToMypage(new URLSearchParams({ error: "invalid_state" }));
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  const clearCookieAndRedirect = (params: URLSearchParams) => {
    const res = redirectToMypage(params);
    res.cookies.delete(LINE_LINK_STATE_COOKIE);
    return res;
  };

  if (userError || !user) {
    return clearCookieAndRedirect(new URLSearchParams({ error: "not_logged_in" }));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, candidate_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "candidate" || !profile.candidate_id) {
    return clearCookieAndRedirect(new URLSearchParams({ error: "not_candidate" }));
  }

  const redirectUri = getLineCallbackRedirectUri();
  const result = await exchangeCodeForLineUserId(code, redirectUri);

  if ("error" in result) {
    return clearCookieAndRedirect(new URLSearchParams({ error: "line_failed" }));
  }

  const { error: updateError } = await supabase
    .from("candidates")
    .update({ line_user_id: result.userId })
    .eq("id", profile.candidate_id);

  if (updateError) {
    if (updateError.code === "23505") {
      return clearCookieAndRedirect(new URLSearchParams({ error: "already_linked" }));
    }
    logger.error({ action: "GET", endpoint: "line/callback", err: updateError }, "LINE連携の候補者情報更新に失敗しました");
    return clearCookieAndRedirect(new URLSearchParams({ error: "update_failed" }));
  }

  return clearCookieAndRedirect(new URLSearchParams({ linked: "1" }));
}
