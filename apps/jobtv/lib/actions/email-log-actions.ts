"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

type EmailLog = Tables<"email_logs">;

/**
 * メール送付ログ一覧を取得（admin のみ・読み取り専用）
 */
export async function getEmailLogs(options?: {
  limit?: number;
  offset?: number;
  status?: "sent" | "failed";
  templateName?: string;
}): Promise<{ data: EmailLog[] | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const limit  = options?.limit  ?? 50;
    const offset = options?.offset ?? 0;

    let query = supabase
      .from("email_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.templateName) {
      query = query.eq("template_name", options.templateName);
    }

    const { data, error } = await query;

    if (error) {
      console.error("getEmailLogs error:", error);
      return { data: null, error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (e) {
    console.error("getEmailLogs error:", e);
    return { data: null, error: "送付ログの取得に失敗しました" };
  }
}

/**
 * メール送付ログの統計を取得（admin のみ）
 */
export async function getEmailLogStats(): Promise<{
  data: {
    totalSent: number;
    totalFailed: number;
    byTemplate: Record<string, { sent: number; failed: number }>;
  } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("email_logs")
      .select("status, template_name");

    if (error) {
      console.error("getEmailLogStats error:", error);
      return { data: null, error: error.message };
    }

    const stats = (data ?? []).reduce(
      (acc, row) => {
        if (row.status === "sent")   acc.totalSent++;
        if (row.status === "failed") acc.totalFailed++;

        if (!acc.byTemplate[row.template_name]) {
          acc.byTemplate[row.template_name] = { sent: 0, failed: 0 };
        }
        if (row.status === "sent")   acc.byTemplate[row.template_name].sent++;
        if (row.status === "failed") acc.byTemplate[row.template_name].failed++;

        return acc;
      },
      {
        totalSent: 0,
        totalFailed: 0,
        byTemplate: {} as Record<string, { sent: number; failed: number }>,
      }
    );

    return { data: stats, error: null };
  } catch (e) {
    console.error("getEmailLogStats error:", e);
    return { data: null, error: "統計の取得に失敗しました" };
  }
}
