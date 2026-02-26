"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * 現在のユーザー（candidate）の LINE 連携状態を返す。
 * candidate ロールでない場合は error を返す。
 */
export async function getLineLinkStatus(): Promise<
  { data: { linked: boolean }; error: null } | { data: null; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "ログインしてください。" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, candidate_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("getLineLinkStatus profile error:", profileError);
      return { data: null, error: "プロフィールの取得に失敗しました。" };
    }

    if (profile.role !== "candidate" || !profile.candidate_id) {
      return { data: null, error: "学生アカウントでのみ LINE 連携が利用できます。" };
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("line_user_id")
      .eq("id", profile.candidate_id)
      .single();

    if (candidateError) {
      console.error("getLineLinkStatus candidate error:", candidateError);
      return { data: null, error: "連携状態の取得に失敗しました。" };
    }

    return {
      data: { linked: candidate != null && candidate.line_user_id != null },
      error: null
    };
  } catch (e) {
    console.error("getLineLinkStatus error:", e);
    return { data: null, error: "連携状態の取得に失敗しました。" };
  }
}

/**
 * 現在のユーザー（candidate）の LINE 連携を解除する。
 */
export async function unlinkLineAccount(): Promise<
  { data: true; error: null } | { data: null; error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: "ログインしてください。" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, candidate_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("unlinkLineAccount profile error:", profileError);
      return { data: null, error: "プロフィールの取得に失敗しました。" };
    }

    if (profile.role !== "candidate" || !profile.candidate_id) {
      return { data: null, error: "学生アカウントでのみ LINE 連携の解除が可能です。" };
    }

    const { error: updateError } = await supabase
      .from("candidates")
      .update({ line_user_id: null })
      .eq("id", profile.candidate_id);

    if (updateError) {
      console.error("unlinkLineAccount update error:", updateError);
      return { data: null, error: "連携の解除に失敗しました。" };
    }

    revalidatePath("/settings/line", "layout");
    return { data: true, error: null };
  } catch (e) {
    console.error("unlinkLineAccount error:", e);
    return { data: null, error: "連携の解除に失敗しました。" };
  }
}
