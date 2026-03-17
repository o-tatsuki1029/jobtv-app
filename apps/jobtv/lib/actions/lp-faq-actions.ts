"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";

type LpFaqItemRow = {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

/** 公開用: display_order 昇順で全件取得 */
export async function getLpFaqItems(): Promise<{
  data: LpFaqItemRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lp_faq_items")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getLpFaqItems", err: e }, "LP FAQ の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Admin用: display_order 昇順で全件取得 */
export async function getAdminLpFaqItems(): Promise<{
  data: LpFaqItemRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lp_faq_items")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getAdminLpFaqItems", err: e }, "管理画面LP FAQ の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** 新規作成 */
export async function createLpFaqItem(formData: FormData): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const question = formData.get("question");
  const answer = formData.get("answer");

  if (!question || typeof question !== "string" || question.trim() === "") {
    return { data: null, error: "質問を入力してください" };
  }
  if (!answer || typeof answer !== "string" || answer.trim() === "") {
    return { data: null, error: "回答を入力してください" };
  }

  try {
    const supabase = createAdminClient();
    const { randomUUID } = await import("crypto");
    const id = randomUUID();

    const { data: maxOrder } = await supabase
      .from("lp_faq_items")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insertError } = await supabase.from("lp_faq_items").insert({
      id,
      question: question.trim(),
      answer: answer.trim(),
      display_order: nextOrder
    });

    if (insertError) {
      logger.error({ action: "createLpFaqItem", err: insertError }, "LP FAQ レコードの挿入に失敗しました");
      return { data: null, error: insertError.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: { id }, error: null };
  } catch (e) {
    logger.error({ action: "createLpFaqItem", err: e }, "LP FAQ の作成に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "作成に失敗しました" };
  }
}

/** 更新 */
export async function updateLpFaqItem(
  id: string,
  formData: FormData
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const question = formData.get("question");
  const answer = formData.get("answer");

  if (!question || typeof question !== "string" || question.trim() === "") {
    return { data: null, error: "質問を入力してください" };
  }
  if (!answer || typeof answer !== "string" || answer.trim() === "") {
    return { data: null, error: "回答を入力してください" };
  }

  try {
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from("lp_faq_items")
      .update({
        question: question.trim(),
        answer: answer.trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateError) {
      logger.error({ action: "updateLpFaqItem", err: updateError }, "LP FAQ の更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "updateLpFaqItem", err: e }, "LP FAQ の更新に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "更新に失敗しました" };
  }
}

/** 削除 */
export async function deleteLpFaqItem(
  id: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("lp_faq_items").delete().eq("id", id);

    if (error) {
      logger.error({ action: "deleteLpFaqItem", err: error }, "LP FAQ の削除に失敗しました");
      return { data: null, error: error.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "deleteLpFaqItem", err: e }, "LP FAQ の削除に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}

/** 並び替え */
export async function reorderLpFaqItems(
  orderedIds: string[]
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  if (orderedIds.length === 0) return { data: true, error: null };

  try {
    const supabase = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("lp_faq_items")
        .update({ display_order: i })
        .eq("id", orderedIds[i]);

      if (error) {
        logger.error({ action: "reorderLpFaqItems", err: error }, "LP FAQ の並び替えに失敗しました");
        return { data: null, error: error.message };
      }
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "reorderLpFaqItems", err: e }, "LP FAQ の並び替えに失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "並び替えに失敗しました" };
  }
}
