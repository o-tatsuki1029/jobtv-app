"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-auth";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";
import type { LineMessage } from "@/types/line-flex.types";
import { replaceMessageVariables } from "@/lib/line-message-variables";

const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB (LINE制限)

type CandidateWithProfile = {
  id: string;
  line_user_id: string;
  graduation_year: number | null;
  school_name: string | null;
  profiles: { last_name: string | null; first_name: string | null }[];
};

function buildVariableMap(row: CandidateWithProfile): Record<string, string> {
  const profile = row.profiles?.[0];
  const lastName = profile?.last_name ?? "";
  const firstName = profile?.first_name ?? "";
  return {
    last_name: lastName,
    first_name: firstName,
    full_name: [lastName, firstName].filter(Boolean).join(""),
    graduation_year: row.graduation_year?.toString() ?? "",
    school_name: row.school_name ?? "",
  };
}

/** セグメント条件（すべてオプション。指定した条件で AND 絞り込み） */
export interface LineBroadcastFilters {
  graduation_years?: number[];
  desired_industries?: string[];
  desired_job_types?: string[];
  school_type?: string;
  major_field?: string;
}

/** リトライ可能なエラーか判定 */
function isRetryableError(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * セグメント条件に該当し、かつ LINE 連携済みの候補者件数を返す。Admin 専用。
 */
export async function getLineBroadcastEligibleCount(
  filters: LineBroadcastFilters
): Promise<{ data: number; error: null } | { data: null; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { data: null, error: "管理者権限が必要です。" };
  }

  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .not("line_user_id", "is", null);

    if (filters.graduation_years?.length) {
      q = q.in("graduation_year", filters.graduation_years);
    }
    if (filters.desired_industries?.length) {
      q = q.overlaps("desired_industry", filters.desired_industries);
    }
    if (filters.desired_job_types?.length) {
      q = q.overlaps("desired_job_type", filters.desired_job_types);
    }
    if (filters.school_type != null && filters.school_type !== "") {
      q = q.eq("school_type", filters.school_type);
    }
    if (filters.major_field != null && filters.major_field !== "") {
      q = q.eq("major_field", filters.major_field);
    }

    const { count, error } = await q;

    if (error) {
      logger.error({ action: "getLineBroadcastEligibleCount", err: error }, "対象件数の取得に失敗");
      return { data: null, error: "対象件数の取得に失敗しました。" };
    }

    return { data: count ?? 0, error: null };
  } catch (e) {
    logger.error({ action: "getLineBroadcastEligibleCount", err: e }, "対象件数の取得に失敗");
    return { data: null, error: "対象件数の取得に失敗しました。" };
  }
}

/**
 * LINE 配信用画像をアップロードし、公開 URL を返す。Admin 専用。
 */
export async function uploadLineBroadcastImage(
  file: File
): Promise<{ data: string | null; error: string | null }> {
  try {
    await requireAdmin();
  } catch {
    return { data: null, error: "管理者権限が必要です。" };
  }

  if (!file || !(file instanceof File)) {
    return { data: null, error: "ファイルを選択してください。" };
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return { data: null, error: "ファイルサイズは10MB以下にしてください。" };
  }
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return { data: null, error: "JPEG, PNG 形式のみアップロードできます。" };
  }

  try {
    const supabase = createAdminClient();
    const { randomUUID } = await import("crypto");
    const id = randomUUID();
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `admin/line-broadcast/${id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      logger.error({ action: "uploadLineBroadcastImage", err: uploadError }, "画像アップロードに失敗");
      return { data: null, error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (e) {
    logger.error({ action: "uploadLineBroadcastImage", err: e }, "画像アップロードに失敗");
    return { data: null, error: e instanceof Error ? e.message : "アップロードに失敗しました。" };
  }
}

const LINE_PUSH_DELAY_MS = 50;
const RETRY_DELAY_MS = 200;

/**
 * セグメント条件からフィルター付き候補者クエリを構築（共通ロジック）
 */
function applyFiltersToQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  q: any,
  filters: LineBroadcastFilters
) {
  if (filters.graduation_years?.length) {
    q = q.in("graduation_year", filters.graduation_years);
  }
  if (filters.desired_industries?.length) {
    q = q.overlaps("desired_industry", filters.desired_industries);
  }
  if (filters.desired_job_types?.length) {
    q = q.overlaps("desired_job_type", filters.desired_job_types);
  }
  if (filters.school_type != null && filters.school_type !== "") {
    q = q.eq("school_type", filters.school_type);
  }
  if (filters.major_field != null && filters.major_field !== "") {
    q = q.eq("major_field", filters.major_field);
  }
  return q;
}

/**
 * 配信の送信コアロジック（sendLineBroadcast / Cron 共用）
 */
export async function executeBroadcast(
  broadcastLogId: string,
  filters: LineBroadcastFilters,
  messages: LineMessage[]
): Promise<{ sent: number; failed: number; blocked: number }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN!;
  const supabase = createAdminClient();

  // status を sending に更新
  await supabase
    .from("line_broadcast_logs")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", broadcastLogId);

  // 対象候補者を取得
  let q = supabase
    .from("candidates")
    .select("id, line_user_id, graduation_year, school_name, profiles!profiles_candidate_id_fkey(last_name, first_name)")
    .not("line_user_id", "is", null);
  q = applyFiltersToQuery(q, filters);

  const { data: rows, error } = await q;

  if (error) {
    await supabase
      .from("line_broadcast_logs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", broadcastLogId);
    throw new Error(`配信対象の取得に失敗: ${error.message}`);
  }

  const targets = (rows ?? []).filter(
    (r): r is CandidateWithProfile => r.line_user_id != null
  );

  // target_count を更新
  await supabase
    .from("line_broadcast_logs")
    .update({ target_count: targets.length, updated_at: new Date().toISOString() })
    .eq("id", broadcastLogId);

  let sent = 0;
  let failed = 0;
  let blocked = 0;

  for (const row of targets) {
    const vars = buildVariableMap(row);
    const personalizedMessages = messages.map((msg) =>
      replaceMessageVariables(msg, vars)
    );
    const now = new Date().toISOString();

    // delivery レコード作成
    const { data: delivery } = await supabase
      .from("line_broadcast_deliveries")
      .insert({
        broadcast_log_id: broadcastLogId,
        candidate_id: row.id,
        line_user_id: row.line_user_id,
        status: "pending",
      })
      .select("id")
      .single();

    const deliveryId = delivery?.id;

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: row.line_user_id,
        messages: personalizedMessages,
      }),
    });

    if (res.ok) {
      sent++;
      if (deliveryId) {
        await supabase
          .from("line_broadcast_deliveries")
          .update({ status: "success", last_attempted_at: now })
          .eq("id", deliveryId);
      }
    } else {
      const errBody = await res.text();
      const retryable = isRetryableError(res.status);
      logger.error(
        { action: "sendLineBroadcast", candidateId: row.id, status: res.status, body: errBody },
        "LINEプッシュ送信に失敗"
      );

      // 即時1回リトライ（retryable error のみ）
      if (retryable) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        const retryRes = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: row.line_user_id,
            messages: personalizedMessages,
          }),
        });

        if (retryRes.ok) {
          sent++;
          if (deliveryId) {
            await supabase
              .from("line_broadcast_deliveries")
              .update({ status: "success", retry_count: 1, last_attempted_at: now })
              .eq("id", deliveryId);
          }
        } else {
          failed++;
          const retryErrBody = await retryRes.text();
          if (deliveryId) {
            await supabase
              .from("line_broadcast_deliveries")
              .update({
                status: "failed",
                error_code: retryRes.status.toString(),
                error_message: retryErrBody.slice(0, 500),
                retry_count: 1,
                last_attempted_at: now,
              })
              .eq("id", deliveryId);
          }
        }
      } else {
        // 恒久エラー → blocked
        blocked++;
        if (deliveryId) {
          await supabase
            .from("line_broadcast_deliveries")
            .update({
              status: "blocked",
              error_code: res.status.toString(),
              error_message: errBody.slice(0, 500),
              last_attempted_at: now,
            })
            .eq("id", deliveryId);
        }
      }
    }

    if (LINE_PUSH_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, LINE_PUSH_DELAY_MS));
    }
  }

  // ログのカウントと状態を更新
  await supabase
    .from("line_broadcast_logs")
    .update({
      status: "sent",
      sent_count: sent,
      failed_count: failed,
      blocked_count: blocked,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", broadcastLogId);

  return { sent, failed, blocked };
}

/**
 * セグメント条件に該当する LINE 連携済み候補者にメッセージをプッシュ配信する。Admin 専用。
 * 配信履歴をログに記録し、候補者ごとの結果を deliveries に保存する。
 */
export async function sendLineBroadcast(
  filters: LineBroadcastFilters,
  messages: LineMessage[],
  options?: { templateId?: string }
): Promise<
  | { data: { sent: number; failed: number; broadcastLogId: string }; error: null }
  | { data: null; error: string }
> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です。" };

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    logger.error({ action: "sendLineBroadcast" }, "LINE_CHANNEL_ACCESS_TOKENが未設定");
    return { data: null, error: "LINE 配信の設定がありません。" };
  }

  if (!messages.length) {
    return { data: null, error: "メッセージを作成してください。" };
  }

  // Basic validation
  for (const msg of messages) {
    if (msg.type === "text" && !msg.text.trim()) {
      return { data: null, error: "テキストメッセージが空です。" };
    }
    if (msg.type === "flex" && !msg.altText.trim()) {
      return { data: null, error: "代替テキストを入力してください。" };
    }
    if (msg.type === "image" && !msg.originalContentUrl) {
      return { data: null, error: "画像URLが必要です。" };
    }
  }

  try {
    const supabase = createAdminClient();

    // 配信ログを作成
    const { data: logData, error: logError } = await supabase
      .from("line_broadcast_logs")
      .insert({
        status: "sending",
        filters_snapshot: filters as Record<string, unknown>,
        messages_snapshot: messages as unknown as Record<string, unknown>,
        created_by: userId,
        template_id: options?.templateId ?? null,
      })
      .select("id")
      .single();

    if (logError || !logData) {
      logger.error({ action: "sendLineBroadcast", err: logError }, "配信ログの作成に失敗");
      return { data: null, error: "配信ログの作成に失敗しました。" };
    }

    const broadcastLogId = logData.id;

    const result = await executeBroadcast(broadcastLogId, filters, messages);

    return {
      data: { sent: result.sent, failed: result.failed, broadcastLogId },
      error: null,
    };
  } catch (e) {
    logger.error({ action: "sendLineBroadcast", err: e }, "LINE配信の実行に失敗");
    return { data: null, error: "配信の実行に失敗しました。" };
  }
}

/**
 * 配信予約を作成する（admin のみ）
 */
export async function scheduleLineBroadcast(
  filters: LineBroadcastFilters,
  messages: LineMessage[],
  scheduledAt: string,
  options?: { templateId?: string }
): Promise<
  | { data: { broadcastLogId: string }; error: null }
  | { data: null; error: string }
> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です。" };

  if (!messages.length) {
    return { data: null, error: "メッセージを作成してください。" };
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { data: null, error: "未来の日時を指定してください。" };
  }

  try {
    const supabase = createAdminClient();

    // 対象件数を事前に取得
    const countResult = await getLineBroadcastEligibleCount(filters);
    const targetCount = countResult.data ?? 0;

    const { data, error } = await supabase
      .from("line_broadcast_logs")
      .insert({
        status: "scheduled",
        filters_snapshot: filters as Record<string, unknown>,
        messages_snapshot: messages as unknown as Record<string, unknown>,
        target_count: targetCount,
        scheduled_at: scheduledDate.toISOString(),
        created_by: userId,
        template_id: options?.templateId ?? null,
      })
      .select("id")
      .single();

    if (error || !data) {
      logger.error({ action: "scheduleLineBroadcast", err: error }, "配信予約の作成に失敗");
      return { data: null, error: "配信予約の作成に失敗しました。" };
    }

    return { data: { broadcastLogId: data.id }, error: null };
  } catch (e) {
    logger.error({ action: "scheduleLineBroadcast", err: e }, "配信予約の作成に失敗");
    return { data: null, error: "配信予約の作成に失敗しました。" };
  }
}

/**
 * テスト送信: 管理者自身の LINE userId にメッセージを送信する（admin のみ）
 */
export async function sendLineTestMessage(
  messages: LineMessage[]
): Promise<{ data: null; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です。" };

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return { data: null, error: "LINE 配信の設定がありません。" };

  if (!messages.length) return { data: null, error: "メッセージを作成してください。" };

  try {
    const supabase = createAdminClient();

    // 管理者の LINE userId を取得
    const { data: adminLine } = await supabase
      .from("admin_line_user_ids")
      .select("line_user_id")
      .eq("profile_id", userId!)
      .single();

    if (!adminLine?.line_user_id) {
      return { data: null, error: "LINE userId が設定されていません。設定画面で登録してください。" };
    }

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: adminLine.line_user_id,
        messages,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ action: "sendLineTestMessage", status: res.status, body: errBody }, "テスト送信に失敗");
      return { data: null, error: `テスト送信に失敗しました (${res.status})` };
    }

    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "sendLineTestMessage", err: e }, "テスト送信に失敗");
    return { data: null, error: "テスト送信に失敗しました。" };
  }
}

/**
 * 管理者の LINE userId を取得（admin のみ）
 */
export async function getAdminLineUserId(): Promise<{
  data: string | null;
  error: string | null;
}> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です。" };

  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("admin_line_user_ids")
      .select("line_user_id")
      .eq("profile_id", userId!)
      .single();

    return { data: data?.line_user_id ?? null, error: null };
  } catch {
    return { data: null, error: null };
  }
}

/**
 * 管理者の LINE userId を登録/更新（admin のみ）
 */
export async function setAdminLineUserId(
  lineUserId: string
): Promise<{ data: null; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です。" };

  if (!lineUserId.trim()) {
    return { data: null, error: "LINE userId を入力してください。" };
  }

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("admin_line_user_ids")
      .upsert(
        {
          profile_id: userId!,
          line_user_id: lineUserId.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" }
      );

    if (error) {
      logger.error({ action: "setAdminLineUserId", err: error }, "LINE userId の設定に失敗");
      return { data: null, error: error.message };
    }
    return { data: null, error: null };
  } catch (e) {
    logger.error({ action: "setAdminLineUserId", err: e }, "LINE userId の設定に失敗");
    return { data: null, error: "LINE userId の設定に失敗しました。" };
  }
}
