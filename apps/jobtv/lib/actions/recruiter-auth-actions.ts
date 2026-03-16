"use server";

import { revalidatePath } from "next/cache";
import {
  signInWithPassword as baseSignInWithPassword,
  resetPasswordForEmail as baseResetPasswordForEmail,
  updatePassword as baseUpdatePassword,
} from "@jobtv-app/shared/actions/auth";
import { getFullSiteUrl } from "@jobtv-app/shared/utils/dev-config";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { PROXY_ORIGINAL_ADMIN_ID_COOKIE } from "@/lib/actions/proxy-login-constants";

/**
 * 企業担当者専用ログイン処理
 * recruiter ロールのユーザーのみログイン可能
 */
export async function recruiterSignIn(formData: FormData): Promise<{
  redirectUrl?: string;
  error: string | null;
}> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const captchaToken = (formData.get("captchaToken") as string) ?? "";

  const result = await baseSignInWithPassword(email, password, captchaToken);

  if (result.error) {
    return { error: result.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証に失敗しました" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: "ユーザー情報の取得に失敗しました" };
  }

  if (profile.role !== "recruiter") {
    await supabase.auth.signOut();
    return {
      error:
        "企業担当者アカウントでログインしてください。求職者の方は通常のログインページをご利用ください。",
    };
  }

  revalidatePath("/", "layout");
  return { redirectUrl: "/studio", error: null };
}

/**
 * 企業担当者用パスワード再設定メール送信
 */
export async function recruiterResetPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const result = await baseResetPasswordForEmail(email, `${getFullSiteUrl(3000)}/studio/update-password`);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

/**
 * 企業担当者用パスワード更新
 */
export async function recruiterUpdatePassword(formData: FormData) {
  const cookieStore = await cookies();
  if (cookieStore.get(PROXY_ORIGINAL_ADMIN_ID_COOKIE)?.value) {
    return { error: "代理ログイン中はパスワードを変更できません" };
  }

  const password = formData.get("password") as string;
  const result = await baseUpdatePassword(password);

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
