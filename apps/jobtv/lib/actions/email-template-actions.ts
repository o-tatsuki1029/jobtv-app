"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

type EmailTemplate = Tables<"email_templates">;

/**
 * メールテンプレート一覧を取得（admin のみ）
 */
export async function getEmailTemplates(): Promise<{
  data: EmailTemplate[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      logger.error({ action: "getEmailTemplates", err: error }, "テンプレート一覧の取得に失敗しました");
      return { data: null, error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getEmailTemplates", err: e }, "テンプレート一覧の取得に失敗しました");
    return { data: null, error: "テンプレート一覧の取得に失敗しました" };
  }
}

/**
 * メールテンプレート単件取得（admin のみ）
 */
export async function getEmailTemplate(id: string): Promise<{
  data: EmailTemplate | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error({ action: "getEmailTemplate", err: error, id }, "テンプレートの取得に失敗しました");
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (e) {
    logger.error({ action: "getEmailTemplate", err: e, id }, "テンプレートの取得に失敗しました");
    return { data: null, error: "テンプレートの取得に失敗しました" };
  }
}

/**
 * メールテンプレートを新規作成（admin のみ）
 */
export async function createEmailTemplate(input: {
  name: string;
  description?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  variables?: string[];
  is_active?: boolean;
}): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const insertData: TablesInsert<"email_templates"> = {
      name:        input.name,
      description: input.description ?? null,
      subject:     input.subject,
      body_html:   input.body_html,
      body_text:   input.body_text ?? null,
      variables:   input.variables ?? [],
      is_active:   input.is_active ?? true,
    };

    const { data, error } = await supabase
      .from("email_templates")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error({ action: "createEmailTemplate", err: error }, "テンプレートの作成に失敗しました");
      return { data: null, error: error.message };
    }

    revalidatePath("/admin/email");
    return { data, error: null };
  } catch (e) {
    logger.error({ action: "createEmailTemplate", err: e }, "テンプレートの作成に失敗しました");
    return { data: null, error: "テンプレートの作成に失敗しました" };
  }
}

/**
 * メールテンプレートを更新（admin のみ）
 */
export async function updateEmailTemplate(
  id: string,
  patch: {
    description?: string;
    subject?: string;
    body_html?: string;
    body_text?: string;
    variables?: string[];
    is_active?: boolean;
  }
): Promise<{ data: EmailTemplate | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const updateData: TablesUpdate<"email_templates"> = { ...patch };

    const { data, error } = await supabase
      .from("email_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error({ action: "updateEmailTemplate", err: error, id }, "テンプレートの更新に失敗しました");
      return { data: null, error: error.message };
    }

    revalidatePath("/admin/email");
    return { data, error: null };
  } catch (e) {
    logger.error({ action: "updateEmailTemplate", err: e, id }, "テンプレートの更新に失敗しました");
    return { data: null, error: "テンプレートの更新に失敗しました" };
  }
}

/**
 * メールテンプレートを無効化（ソフト削除）（admin のみ）
 */
export async function deleteEmailTemplate(
  id: string
): Promise<{ data: null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("email_templates")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      logger.error({ action: "deleteEmailTemplate", err: error, id }, "テンプレートの削除に失敗しました");
      return { data: null, error: error.message };
    }

    revalidatePath("/admin/email");
    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "deleteEmailTemplate", err: e, id }, "テンプレートの削除に失敗しました");
    return { data: null, error: "テンプレートの削除に失敗しました" };
  }
}
