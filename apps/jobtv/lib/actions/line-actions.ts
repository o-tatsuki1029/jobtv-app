"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

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
      logger.error({ action: "getLineLinkStatus", err: profileError }, "プロフィールの取得に失敗");
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
      logger.error({ action: "getLineLinkStatus", err: candidateError }, "LINE連携状態の取得に失敗");
      return { data: null, error: "連携状態の取得に失敗しました。" };
    }

    return {
      data: { linked: candidate != null && candidate.line_user_id != null },
      error: null
    };
  } catch (e) {
    logger.error({ action: "getLineLinkStatus", err: e }, "LINE連携状態の取得に失敗");
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
      logger.error({ action: "unlinkLineAccount", err: profileError }, "プロフィールの取得に失敗");
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
      logger.error({ action: "unlinkLineAccount", err: updateError }, "LINE連携の解除に失敗");
      return { data: null, error: "連携の解除に失敗しました。" };
    }

    revalidatePath("/settings/line", "layout");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "unlinkLineAccount", err: e }, "LINE連携の解除に失敗");
    return { data: null, error: "連携の解除に失敗しました。" };
  }
}
