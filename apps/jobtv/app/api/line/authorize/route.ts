import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildLineLoginUrl } from "@/lib/line";
import { getRedirectPathByRole } from "@/lib/auth/redirect";

const LINE_LINK_STATE_COOKIE = "line_link_state";
const STATE_MAX_AGE = 600;

/**
 * LINE 連携開始: candidate のみ許可。state を cookie に保存し、LINE Login へリダイレクトする。
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, candidate_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "candidate" || !profile.candidate_id) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    return NextResponse.redirect(new URL(getRedirectPathByRole(profile?.role ?? "candidate"), base));
  }

  const state = crypto.randomUUID();
  const loginUrl = buildLineLoginUrl(state);

  const res = NextResponse.redirect(loginUrl);
  res.cookies.set(LINE_LINK_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: STATE_MAX_AGE,
    path: "/"
  });
  return res;
}
