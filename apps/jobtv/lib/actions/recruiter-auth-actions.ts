"use server";

import { revalidatePath } from "next/cache";
import { signInWithPassword as baseSignInWithPassword } from "@jobtv-app/shared/actions/auth";
import { createClient } from "@/lib/supabase/server";

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

  const result = await baseSignInWithPassword(email, password);

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
