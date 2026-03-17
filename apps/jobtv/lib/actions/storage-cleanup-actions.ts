"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { executeApprovedDeletions, enqueueStorageDeletionBatch } from "@/lib/storage/deletion-queue";
import { extractSupabaseStoragePath } from "@/lib/storage/storage-cleanup";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/aws/s3-singleton";

// ---------- キュー管理 ----------

type QueueItem = {
  id: string;
  storage_type: string;
  bucket: string;
  path: string;
  is_prefix: boolean;
  source: string;
  source_detail: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  executed_at: string | null;
  error_message: string | null;
};

/** キュー一覧取得（フィルタ付き） */
export async function getStorageDeletionQueue(filters: {
  status?: string;
  source?: string;
  page?: number;
  perPage?: number;
}): Promise<{ data: QueueItem[] | null; total: number; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, total: 0, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const page = filters.page ?? 1;
    const perPage = filters.perPage ?? 50;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = supabase
      .from("storage_deletion_queue")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.source) {
      query = query.eq("source", filters.source);
    }

    const { data, error, count } = await query;
    if (error) return { data: null, total: 0, error: error.message };
    return { data: data ?? [], total: count ?? 0, error: null };
  } catch (e) {
    return { data: null, total: 0, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** キューのステータス別件数を取得 */
export async function getQueueStatusCounts(): Promise<{
  data: { pending: number; approved: number; completed: number; failed: number } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const statuses = ["pending", "approved", "completed", "failed"] as const;
    const counts: Record<string, number> = {};

    for (const status of statuses) {
      const { count } = await supabase
        .from("storage_deletion_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", status);
      counts[status] = count ?? 0;
    }

    return {
      data: counts as { pending: number; approved: number; completed: number; failed: number },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** pending → approved に一括変更 */
export async function approveQueueItems(
  ids: string[]
): Promise<{ data: number; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: 0, error: "管理者権限が必要です" };

  if (ids.length === 0) return { data: 0, error: null };

  try {
    const supabase = createAdminClient();
    const { error, count } = await supabase
      .from("storage_deletion_queue")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .in("id", ids)
      .eq("status", "pending");

    if (error) return { data: 0, error: error.message };

    if (userId) {
      logAudit({
        userId,
        action: "storage.approve",
        category: "storage",
        resourceType: "storage_deletion_queue",
        app: "jobtv",
        metadata: { ids, count: count ?? ids.length },
      });
    }

    revalidatePath("/admin/storage-cleanup");
    return { data: count ?? ids.length, error: null };
  } catch (e) {
    return { data: 0, error: e instanceof Error ? e.message : "承認に失敗しました" };
  }
}

/** 全 pending を一括承認 */
export async function approveAllPending(): Promise<{ data: number; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: 0, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error, count } = await supabase
      .from("storage_deletion_queue")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("status", "pending");

    if (error) return { data: 0, error: error.message };

    if (userId) {
      logAudit({
        userId,
        action: "storage.approve_all",
        category: "storage",
        resourceType: "storage_deletion_queue",
        app: "jobtv",
        metadata: { approvedCount: count ?? 0 },
      });
    }

    revalidatePath("/admin/storage-cleanup");
    return { data: count ?? 0, error: null };
  } catch (e) {
    return { data: 0, error: e instanceof Error ? e.message : "一括承認に失敗しました" };
  }
}

/** 承認済みアイテムを実行する */
export async function executeApprovedItems(): Promise<{
  data: { processed: number; succeeded: number; failed: number } | null;
  error: string | null;
}> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const result = await executeApprovedDeletions();

    if (userId) {
      logAudit({
        userId,
        action: "storage.execute",
        category: "storage",
        resourceType: "storage_deletion_queue",
        app: "jobtv",
        metadata: result,
      });
    }

    revalidatePath("/admin/storage-cleanup");
    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "実行に失敗しました" };
  }
}

/** completed/failed を削除（クリーンアップ） */
export async function clearCompletedItems(): Promise<{ data: number; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: 0, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error, count } = await supabase
      .from("storage_deletion_queue")
      .delete()
      .in("status", ["completed", "failed"]);

    if (error) return { data: 0, error: error.message };

    if (userId) {
      logAudit({
        userId,
        action: "storage.clear_completed",
        category: "storage",
        resourceType: "storage_deletion_queue",
        app: "jobtv",
        metadata: { clearedCount: count ?? 0 },
      });
    }

    revalidatePath("/admin/storage-cleanup");
    return { data: count ?? 0, error: null };
  } catch (e) {
    return { data: 0, error: e instanceof Error ? e.message : "クリーンアップに失敗しました" };
  }
}

// ---------- スキャン予約 ----------

type ScheduleRow = {
  id: string;
  scan_from: string;
  scan_to: string;
  scheduled_at: string;
  status: string;
  created_at: string;
  result: Record<string, unknown> | null;
};

/** スキャン予約一覧取得 */
export async function getCleanupSchedules(): Promise<{
  data: ScheduleRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("storage_cleanup_schedules")
      .select("*")
      .order("scheduled_at", { ascending: false })
      .limit(20);

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** スキャン予約を作成 */
export async function createCleanupSchedule(params: {
  scanFrom: string;
  scanTo: string;
  scheduledAt: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("storage_cleanup_schedules")
      .insert({
        scan_from: params.scanFrom,
        scan_to: params.scanTo,
        scheduled_at: params.scheduledAt,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    if (userId) {
      logAudit({
        userId,
        action: "storage.schedule_scan",
        category: "storage",
        resourceType: "storage_cleanup_schedules",
        resourceId: data.id,
        app: "jobtv",
        metadata: params,
      });
    }

    revalidatePath("/admin/storage-cleanup");
    return { data: { id: data.id }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "予約に失敗しました" };
  }
}

/** スキャンを即時実行する（予約を作成し、即座に実行） */
export async function executeImmediateScan(params: {
  scanFrom: string;
  scanTo: string;
}): Promise<{ data: { orphanedCount: number } | null; error: string | null }> {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // スケジュールを作成（即時実行として記録）
    const { data, error } = await supabase
      .from("storage_cleanup_schedules")
      .insert({
        scan_from: params.scanFrom,
        scan_to: params.scanTo,
        scheduled_at: now,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) return { data: null, error: error.message };

    // 即座に実行
    const result = await executeFullScan(data.id);

    if (userId) {
      logAudit({
        userId,
        action: "storage.immediate_scan",
        category: "storage",
        resourceType: "storage_cleanup_schedules",
        resourceId: data.id,
        app: "jobtv",
        metadata: { ...params, orphanedCount: result.orphanedCount },
      });
    }

    revalidatePath("/admin/storage-cleanup");

    if (result.error) return { data: null, error: result.error };
    return { data: { orphanedCount: result.orphanedCount }, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "即時実行に失敗しました" };
  }
}

// ---------- フルスキャン実行ロジック ----------

/** DB 内の全ストレージ参照 URL を収集する */
async function collectAllReferencedUrls(): Promise<Set<string>> {
  const supabase = createAdminClient();
  const urls = new Set<string>();

  const queries: { table: string; columns: string[] }[] = [
    { table: "videos_draft", columns: ["video_url", "thumbnail_url", "auto_thumbnail_url", "streaming_url"] },
    { table: "videos", columns: ["video_url", "source_url", "streaming_url", "thumbnail_url", "auto_thumbnail_url"] },
    { table: "top_page_hero_items", columns: ["video_url", "thumbnail_url", "auto_thumbnail_url"] },
    { table: "lp_sample_videos", columns: ["video_url", "thumbnail_url"] },
    { table: "lp_company_logos", columns: ["image_url"] },
    { table: "top_page_ambassadors", columns: ["avatar_url"] },
    { table: "top_page_shun_diaries", columns: ["thumbnail_url"] },
    { table: "top_page_banners", columns: ["image_url"] },
    { table: "top_page_documentaries", columns: ["thumbnail_url"] },
    { table: "lp_scroll_banners", columns: ["image_url"] },
  ];

  for (const { table, columns } of queries) {
    const { data } = await supabase.from(table).select(columns.join(", "));
    if (data) {
      for (const row of data) {
        for (const col of columns) {
          const val = (row as unknown as Record<string, unknown>)[col];
          if (typeof val === "string" && val.trim() !== "") {
            urls.add(val);
          }
        }
      }
    }
  }

  return urls;
}

/** フルスキャンを実行し、孤立ファイルをキューに登録する */
export async function executeFullScan(scheduleId: string): Promise<{
  orphanedCount: number;
  error: string | null;
}> {
  const supabase = createAdminClient();

  // ステータスを running に
  await supabase
    .from("storage_cleanup_schedules")
    .update({ status: "running" })
    .eq("id", scheduleId);

  try {
    const { data: schedule } = await supabase
      .from("storage_cleanup_schedules")
      .select("scan_from, scan_to")
      .eq("id", scheduleId)
      .single();

    if (!schedule) return { orphanedCount: 0, error: "スケジュールが見つかりません" };

    const scanFrom = new Date(schedule.scan_from);
    const scanTo = new Date(schedule.scan_to);

    // DB 参照 URL を収集
    const referencedUrls = await collectAllReferencedUrls();

    // Supabase Storage パスに変換
    const referencedSupabasePaths = new Set<string>();
    for (const url of referencedUrls) {
      const path = extractSupabaseStoragePath(url, "company-assets");
      if (path) referencedSupabasePaths.add(path);
    }

    // CloudFront URL → S3 キーに変換
    const cloudFrontBase = (process.env.AWS_CLOUDFRONT_URL ?? "").replace(/\/$/, "");
    const referencedS3Keys = new Set<string>();
    for (const url of referencedUrls) {
      if (cloudFrontBase && url.startsWith(cloudFrontBase)) {
        const key = url.substring(cloudFrontBase.length + 1);
        referencedS3Keys.add(key);
      }
    }

    const orphanedItems: {
      storageType: "s3" | "supabase";
      bucket: string;
      path: string;
      isPrefix: boolean;
      source: string;
      sourceDetail?: string;
    }[] = [];

    // S3 スキャン
    const s3Bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      const s3Client = getS3Client();
      for (const prefix of ["companies/", "admin/hero-items/"]) {
        let continuationToken: string | undefined;
        do {
          const result = await s3Client.send(
            new ListObjectsV2Command({
              Bucket: s3Bucket,
              Prefix: prefix,
              ContinuationToken: continuationToken,
            })
          );
          for (const obj of result.Contents ?? []) {
            if (!obj.Key || !obj.LastModified) continue;
            if (obj.LastModified < scanFrom || obj.LastModified > scanTo) continue;
            if (!referencedS3Keys.has(obj.Key)) {
              orphanedItems.push({
                storageType: "s3",
                bucket: s3Bucket,
                path: obj.Key,
                isPrefix: false,
                source: "full_scan",
                sourceDetail: `scheduleId=${scheduleId}`,
              });
            }
          }
          continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
        } while (continuationToken);
      }
    }

    // Supabase Storage スキャン
    const supabasePrefixes = [
      "admin/hero-items", "admin/lp-videos", "admin/lp-logos",
      "admin/ambassadors", "admin/shun-diaries", "admin/banners",
      "admin/documentaries", "admin/lp-scroll-banner",
    ];

    for (const prefix of supabasePrefixes) {
      const { data: folders } = await supabase.storage
        .from("company-assets")
        .list(prefix);

      for (const folder of folders ?? []) {
        const { data: files } = await supabase.storage
          .from("company-assets")
          .list(`${prefix}/${folder.name}`);

        for (const file of files ?? []) {
          const filePath = `${prefix}/${folder.name}/${file.name}`;
          const fileDate = file.created_at ? new Date(file.created_at) : null;
          if (fileDate && (fileDate < scanFrom || fileDate > scanTo)) continue;
          if (!referencedSupabasePaths.has(filePath)) {
            orphanedItems.push({
              storageType: "supabase",
              bucket: "company-assets",
              path: filePath,
              isPrefix: false,
              source: "full_scan",
              sourceDetail: `scheduleId=${scheduleId}`,
            });
          }
        }
      }
    }

    // キューに一括登録
    if (orphanedItems.length > 0) {
      await enqueueStorageDeletionBatch(orphanedItems);
    }

    // スケジュールを完了に
    await supabase
      .from("storage_cleanup_schedules")
      .update({
        status: "completed",
        result: {
          orphanedCount: orphanedItems.length,
          s3Count: orphanedItems.filter((i) => i.storageType === "s3").length,
          supabaseCount: orphanedItems.filter((i) => i.storageType === "supabase").length,
          executedAt: new Date().toISOString(),
        },
      })
      .eq("id", scheduleId);

    return { orphanedCount: orphanedItems.length, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "スキャンに失敗しました";
    logger.error({ action: "executeFullScan", err: error, scheduleId }, "フルスキャンに失敗");

    await supabase
      .from("storage_cleanup_schedules")
      .update({
        status: "failed",
        result: { error: msg },
      })
      .eq("id", scheduleId);

    return { orphanedCount: 0, error: msg };
  }
}
