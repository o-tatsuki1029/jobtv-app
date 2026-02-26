import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForLineUserId, getLineCallbackRedirectUri } from "@/lib/line";

const LINE_LINK_STATE_COOKIE = "line_link_state";
const SETTINGS_LINE_PATH = "/settings/line";

function redirectToSettingsLine(searchParams: URLSearchParams = new URLSearchParams()) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const q = searchParams.toString();
  const path = q ? `${SETTINGS_LINE_PATH}?${q}` : SETTINGS_LINE_PATH;
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
    return redirectToSettingsLine(new URLSearchParams({ error: "invalid_callback" }));
  }

  const savedState = request.cookies.get(LINE_LINK_STATE_COOKIE)?.value;
  if (!savedState || savedState !== state) {
    return redirectToSettingsLine(new URLSearchParams({ error: "invalid_state" }));
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  const clearCookieAndRedirect = (params: URLSearchParams) => {
    const res = redirectToSettingsLine(params);
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
    console.error("LINE callback update candidates error:", updateError);
    return clearCookieAndRedirect(new URLSearchParams({ error: "update_failed" }));
  }

  return clearCookieAndRedirect(new URLSearchParams({ linked: "1" }));
}
