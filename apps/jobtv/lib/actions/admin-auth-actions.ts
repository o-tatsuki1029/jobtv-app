"use server";

import { revalidatePath } from "next/cache";
import { signInWithPassword as baseSignInWithPassword } from "@jobtv-app/shared/actions/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * 管理者専用ログイン処理
 * adminロールのユーザーのみログイン可能
 */
export async function adminSignIn(formData: FormData): Promise<{
  redirectUrl?: string;
  error: string | null;
}> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // ログイン試行
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

  // adminロール以外はログインを拒否
  if (profile.role !== "admin") {
    // ログアウトして終了
    await supabase.auth.signOut();
    return { error: "管理者権限がありません。一般ユーザーのログインは通常のログインページをご利用ください。" };
  }

  // 管理者ログイン成功
  revalidatePath("/", "layout");
  
  // クライアント側でリダイレクトするため、URLを返す
  return { redirectUrl: "/admin", error: null };
}


