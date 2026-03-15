"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";
import type {
  LineBroadcastLog,
  LineBroadcastLogStats,
  LineBroadcastDeliveryWithCandidate,
} from "@/types/line-broadcast.types";

/**
 * LINE 配信ログ一覧を取得（admin のみ）
 */
export async function getLineBroadcastLogs(options?: {
  limit?: number;
  offset?: number;
  status?: string;
}): Promise<{ data: LineBroadcastLog[] | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let query = supabase
      .from("line_broadcast_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ action: "getLineBroadcastLogs", err: error }, "配信ログの取得に失敗");
      return { data: null, error: error.message };
    }
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getLineBroadcastLogs", err: e }, "配信ログの取得に失敗");
    return { data: null, error: "配信ログの取得に失敗しました" };
  }
}

/**
 * LINE 配信ログ詳細を取得（admin のみ）
 */
export async function getLineBroadcastLogDetail(
  id: string
): Promise<{ data: LineBroadcastLog | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("line_broadcast_logs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      logger.error({ action: "getLineBroadcastLogDetail", err: error, id }, "配信ログ詳細の取得に失敗");
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (e) {
    logger.error({ action: "getLineBroadcastLogDetail", err: e, id }, "配信ログ詳細の取得に失敗");
    return { data: null, error: "配信ログ詳細の取得に失敗しました" };
  }
}

/**
 * LINE 配信ログの統計を取得（admin のみ）
 */
export async function getLineBroadcastLogStats(): Promise<{
  data: LineBroadcastLogStats | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("line_broadcast_logs")
      .select("status, sent_count, failed_count, blocked_count");

    if (error) {
      logger.error({ action: "getLineBroadcastLogStats", err: error }, "配信ログ統計の取得に失敗");
      return { data: null, error: error.message };
    }

    const stats = (data ?? []).reduce<LineBroadcastLogStats>(
      (acc, row) => {
        acc.totalBroadcasts++;
        acc.totalSent += row.sent_count;
        acc.totalFailed += row.failed_count;
        acc.totalBlocked += row.blocked_count;
        return acc;
      },
      { totalSent: 0, totalFailed: 0, totalBlocked: 0, totalBroadcasts: 0 }
    );

    return { data: stats, error: null };
  } catch (e) {
    logger.error({ action: "getLineBroadcastLogStats", err: e }, "配信ログ統計の取得に失敗");
    return { data: null, error: "統計の取得に失敗しました" };
  }
}

/**
 * 配信結果の候補者別一覧を取得（admin のみ）
 */
export async function getLineBroadcastDeliveries(
  broadcastLogId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  }
): Promise<{
  data: LineBroadcastDeliveryWithCandidate[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    let query = supabase
      .from("line_broadcast_deliveries")
      .select("*")
      .eq("broadcast_log_id", broadcastLogId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data: deliveries, error } = await query;

    if (error) {
      logger.error({ action: "getLineBroadcastDeliveries", err: error }, "配信結果の取得に失敗");
      return { data: null, error: error.message };
    }

    // 候補者情報を結合
    const candidateIds = (deliveries ?? []).map((d) => d.candidate_id);
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, graduation_year, school_name, profiles!profiles_candidate_id_fkey(last_name, first_name)")
      .in("id", candidateIds);

    const candidateMap = new Map(
      (candidates ?? []).map((c) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        const lastName = profile?.last_name ?? "";
        const firstName = profile?.first_name ?? "";
        return [
          c.id,
          {
            name: [lastName, firstName].filter(Boolean).join(" ") || "—",
            school_name: c.school_name,
            graduation_year: c.graduation_year,
          },
        ];
      })
    );

    const result: LineBroadcastDeliveryWithCandidate[] = (deliveries ?? []).map(
      (d) => ({
        ...d,
        candidate_name: candidateMap.get(d.candidate_id)?.name ?? "—",
        school_name: candidateMap.get(d.candidate_id)?.school_name ?? null,
        graduation_year: candidateMap.get(d.candidate_id)?.graduation_year ?? null,
      })
    );

    return { data: result, error: null };
  } catch (e) {
    logger.error({ action: "getLineBroadcastDeliveries", err: e }, "配信結果の取得に失敗");
    return { data: null, error: "配信結果の取得に失敗しました" };
  }
}

/**
 * 配信結果を CSV 文字列としてエクスポート（admin のみ・BOM 付き）
 */
export async function exportLineBroadcastDeliveries(
  broadcastLogId: string
): Promise<{ data: string | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();

    const { data: deliveries, error } = await supabase
      .from("line_broadcast_deliveries")
      .select("*")
      .eq("broadcast_log_id", broadcastLogId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error({ action: "exportLineBroadcastDeliveries", err: error }, "CSV エクスポートに失敗");
      return { data: null, error: error.message };
    }

    const candidateIds = (deliveries ?? []).map((d) => d.candidate_id);
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id, graduation_year, school_name, profiles!profiles_candidate_id_fkey(last_name, first_name)")
      .in("id", candidateIds);

    const candidateMap = new Map(
      (candidates ?? []).map((c) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return [
          c.id,
          {
            last_name: profile?.last_name ?? "",
            first_name: profile?.first_name ?? "",
            school_name: c.school_name ?? "",
            graduation_year: c.graduation_year?.toString() ?? "",
          },
        ];
      })
    );

    const statusLabel: Record<string, string> = {
      pending: "送信待ち",
      success: "成功",
      failed: "失敗",
      blocked: "ブロック",
    };

    const header = "氏名,学校,卒年,LINE ID,ステータス,エラー,日時";
    const rows = (deliveries ?? []).map((d) => {
      const c = candidateMap.get(d.candidate_id);
      const name = c ? [c.last_name, c.first_name].filter(Boolean).join(" ") : "";
      const dateStr = d.last_attempted_at
        ? new Date(d.last_attempted_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
        : "";
      return [
        name,
        c?.school_name ?? "",
        c?.graduation_year ?? "",
        d.line_user_id,
        statusLabel[d.status] ?? d.status,
        d.error_message ?? "",
        dateStr,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    // BOM 付き UTF-8 CSV
    const bom = "\uFEFF";
    const csv = bom + [header, ...rows].join("\n");

    return { data: csv, error: null };
  } catch (e) {
    logger.error({ action: "exportLineBroadcastDeliveries", err: e }, "CSV エクスポートに失敗");
    return { data: null, error: "CSV エクスポートに失敗しました" };
  }
}

/**
 * 予約配信をキャンセルする（admin のみ）
 */
export async function cancelScheduledBroadcast(
  broadcastLogId: string
): Promise<{ data: null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("line_broadcast_logs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", broadcastLogId)
      .eq("status", "scheduled");

    if (error) {
      logger.error({ action: "cancelScheduledBroadcast", err: error }, "予約キャンセルに失敗");
      return { data: null, error: error.message };
    }
    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "cancelScheduledBroadcast", err: e }, "予約キャンセルに失敗");
    return { data: null, error: "予約キャンセルに失敗しました" };
  }
}

/**
 * 失敗した配信を手動リトライ（admin のみ）
 */
export async function retryFailedDeliveries(
  broadcastLogId: string
): Promise<{
  data: { retried: number; success: number; failed: number } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { data: null, error: "LINE 配信の設定がありません。" };

  try {
    const supabase = createAdminClient();

    const { data: deliveries, error } = await supabase
      .from("line_broadcast_deliveries")
      .select("*")
      .eq("broadcast_log_id", broadcastLogId)
      .eq("status", "failed")
      .lt("retry_count", 3);

    if (error) {
      logger.error({ action: "retryFailedDeliveries", err: error }, "リトライ対象の取得に失敗");
      return { data: null, error: error.message };
    }

    if (!deliveries?.length) {
      return { data: { retried: 0, success: 0, failed: 0 }, error: null };
    }

    // 配信ログからメッセージを取得
    const { data: logData } = await supabase
      .from("line_broadcast_logs")
      .select("messages_snapshot")
      .eq("id", broadcastLogId)
      .single();

    if (!logData) {
      return { data: null, error: "配信ログが見つかりません" };
    }

    const messages = logData.messages_snapshot as unknown[];
    let success = 0;
    let failed = 0;

    for (const delivery of deliveries) {
      const now = new Date().toISOString();

      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: delivery.line_user_id,
          messages,
        }),
      });

      if (res.ok) {
        success++;
        await supabase
          .from("line_broadcast_deliveries")
          .update({
            status: "success",
            retry_count: delivery.retry_count + 1,
            last_attempted_at: now,
          })
          .eq("id", delivery.id);
      } else {
        failed++;
        const errBody = await res.text();
        const isPermanent = res.status === 400 || res.status === 401 || res.status === 403;
        await supabase
          .from("line_broadcast_deliveries")
          .update({
            status: isPermanent ? "blocked" : "failed",
            retry_count: delivery.retry_count + 1,
            last_attempted_at: now,
            error_code: res.status.toString(),
            error_message: errBody.slice(0, 500),
          })
          .eq("id", delivery.id);
      }

      await new Promise((r) => setTimeout(r, 50));
    }

    // ログのカウントを更新
    const { data: allDeliveries } = await supabase
      .from("line_broadcast_deliveries")
      .select("status")
      .eq("broadcast_log_id", broadcastLogId);

    if (allDeliveries) {
      const counts = allDeliveries.reduce(
        (acc, d) => {
          if (d.status === "success") acc.sent++;
          else if (d.status === "failed") acc.failed++;
          else if (d.status === "blocked") acc.blocked++;
          return acc;
        },
        { sent: 0, failed: 0, blocked: 0 }
      );
      await supabase
        .from("line_broadcast_logs")
        .update({
          sent_count: counts.sent,
          failed_count: counts.failed,
          blocked_count: counts.blocked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", broadcastLogId);
    }

    return {
      data: { retried: deliveries.length, success, failed },
      error: null,
    };
  } catch (e) {
    logger.error({ action: "retryFailedDeliveries", err: e }, "リトライに失敗");
    return { data: null, error: "リトライに失敗しました" };
  }
}
