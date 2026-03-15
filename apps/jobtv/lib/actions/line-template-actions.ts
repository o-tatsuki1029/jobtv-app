"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import type { Tables } from "@jobtv-app/shared/types";

type LineMessageTemplate = Tables<"line_message_templates">;

/**
 * LINE メッセージテンプレート一覧を取得（admin のみ）
 */
export async function getLineMessageTemplates(): Promise<{
  data: LineMessageTemplate[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("line_message_templates")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ action: "getLineMessageTemplates", err: error }, "テンプレート一覧の取得に失敗");
      return { data: null, error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getLineMessageTemplates", err: e }, "テンプレート一覧の取得に失敗");
    return { data: null, error: "テンプレート一覧の取得に失敗しました" };
  }
}

/**
 * LINE メッセージテンプレート単件取得（admin のみ）
 */
export async function getLineMessageTemplate(id: string): Promise<{
  data: LineMessageTemplate | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("line_message_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error({ action: "getLineMessageTemplate", err: error, id }, "テンプレートの取得に失敗");
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (e) {
    logger.error({ action: "getLineMessageTemplate", err: e, id }, "テンプレートの取得に失敗");
    return { data: null, error: "テンプレートの取得に失敗しました" };
  }
}

/**
 * LINE メッセージテンプレートを新規作成（admin のみ）
 */
export async function createLineMessageTemplate(input: {
  name: string;
  description?: string;
  message_type: string;
  messages_json: unknown;
  builder_state_json?: unknown;
}): Promise<{ data: LineMessageTemplate | null; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  if (!input.name.trim()) {
    return { data: null, error: "テンプレート名を入力してください" };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("line_message_templates")
      .insert({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        message_type: input.message_type,
        messages_json: input.messages_json as Record<string, unknown>,
        builder_state_json: (input.builder_state_json as Record<string, unknown>) ?? null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { data: null, error: "同名のテンプレートが既に存在します" };
      }
      logger.error({ action: "createLineMessageTemplate", err: error }, "テンプレートの作成に失敗");
      return { data: null, error: error.message };
    }

    revalidatePath("/admin/line/templates");
    return { data, error: null };
  } catch (e) {
    logger.error({ action: "createLineMessageTemplate", err: e }, "テンプレートの作成に失敗");
    return { data: null, error: "テンプレートの作成に失敗しました" };
  }
}

/**
 * LINE メッセージテンプレートを更新（admin のみ）
 */
export async function updateLineMessageTemplate(
  id: string,
  patch: {
    name?: string;
    description?: string;
    message_type?: string;
    messages_json?: unknown;
    builder_state_json?: unknown;
  }
): Promise<{ data: LineMessageTemplate | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.name !== undefined) updateData.name = patch.name.trim();
    if (patch.description !== undefined) updateData.description = patch.description.trim() || null;
    if (patch.message_type !== undefined) updateData.message_type = patch.message_type;
    if (patch.messages_json !== undefined) updateData.messages_json = patch.messages_json;
    if (patch.builder_state_json !== undefined) updateData.builder_state_json = patch.builder_state_json;

    const { data, error } = await supabase
      .from("line_message_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { data: null, error: "同名のテンプレートが既に存在します" };
      }
      logger.error({ action: "updateLineMessageTemplate", err: error, id }, "テンプレートの更新に失敗");
      return { data: null, error: error.message };
    }

    revalidatePath("/admin/line/templates");
    return { data, error: null };
  } catch (e) {
    logger.error({ action: "updateLineMessageTemplate", err: e, id }, "テンプレートの更新に失敗");
    return { data: null, error: "テンプレートの更新に失敗しました" };
  }
}

/**
 * LINE メッセージテンプレートを無効化（ソフト削除）（admin のみ）
 */
export async function deleteLineMessageTemplate(
  id: string
): Promise<{ data: null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("line_message_templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      logger.error({ action: "deleteLineMessageTemplate", err: error, id }, "テンプレートの削除に失敗");
      return { data: null, error: error.message };
    }

    revalidatePath("/admin/line/templates");
    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "deleteLineMessageTemplate", err: e, id }, "テンプレートの削除に失敗");
    return { data: null, error: "テンプレートの削除に失敗しました" };
  }
}
