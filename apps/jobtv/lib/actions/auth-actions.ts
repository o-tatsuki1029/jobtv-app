"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  signUp as baseSignUp,
  signInWithPassword as baseSignInWithPassword,
  signOut as baseSignOut,
  resetPasswordForEmail as baseResetPasswordForEmail,
  updatePassword as baseUpdatePassword
} from "@jobtv-app/shared/actions/auth";
import { getFullSiteUrl } from "@jobtv-app/shared/utils/dev-config";
import { createClient } from "@/lib/supabase/server";

/**
 * サインアップ処理
 */
export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const result = await baseSignUp(email, password, `${getFullSiteUrl(3002)}/api/auth/callback`);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

/**
 * ログイン処理（一般ユーザー用）
 * 管理者はログインできません
 */
export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const result = await baseSignInWithPassword(email, password);

  if (result.error) {
    return { error: result.error };
  }

  // ログイン成功後、ロールをチェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "認証に失敗しました" };
  }

  // プロフィールからロールを取得
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // ログアウトして終了
    await supabase.auth.signOut();
    return { error: "ユーザー情報の取得に失敗しました" };
  }

  // adminロールの場合はログインを拒否
  if (profile.role === "admin") {
    // ログアウトして終了
    await supabase.auth.signOut();
    return { error: "管理者アカウントはこちらからログインできません。管理者ログインページをご利用ください。" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * ログアウト処理
 */
export async function signOut() {
  await baseSignOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * パスワード再設定メール送信
 */
export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const result = await baseResetPasswordForEmail(email, `${getFullSiteUrl(3002)}/auth/update-password`);

  if (result.error) {
    return { error: result.error };
  }

  return { success: true };
}

/**
 * パスワード更新
 */
export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const result = await baseUpdatePassword(password);

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
