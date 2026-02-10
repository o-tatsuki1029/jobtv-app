"use server";

import { createClient } from "@jobtv-app/shared/supabase/server";
import { translateAuthError } from "@jobtv-app/shared/auth";

/**
 * パスワードでサインイン
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: translateAuthError(error) };
  }

  return { error: null };
}

/**
 * サインアップ
 */
export async function signUp(
  email: string,
  password: string,
  emailRedirectTo?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    return { error: translateAuthError(error) };
  }

  return { error: null };
}

/**
 * サインアウト
 */
export async function signOut(): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * パスワードリセットメールを送信
 */
export async function resetPasswordForEmail(
  email: string,
  redirectTo?: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { error: error.message || "パスワードリセットメールの送信に失敗しました" };
  }

  return { error: null };
}

/**
 * パスワードを更新
 */
export async function updatePassword(
  password: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // セッションを確認
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error:
        "セッションが見つかりません。パスワードリセットリンクから再度アクセスしてください。",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}


