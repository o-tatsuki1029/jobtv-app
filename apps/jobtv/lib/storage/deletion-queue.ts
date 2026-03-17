"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { deleteS3Object, deleteS3Prefix } from "@/lib/aws/s3-delete";
import {
  deleteSupabaseStorageFiles,
  deleteSupabaseStoragePrefix,
} from "@/lib/storage/storage-cleanup";

type EnqueueParams = {
  storageType: "s3" | "supabase";
  bucket: string;
  path: string;
  isPrefix: boolean;
  source: string;
  sourceDetail?: string;
};

/**
 * ストレージ削除をキューに登録する。
 * 全ての削除操作はこの関数を経由してキューに入れる。
 */
export async function enqueueStorageDeletion(
  params: EnqueueParams
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("storage_deletion_queue").insert({
      storage_type: params.storageType,
      bucket: params.bucket,
      path: params.path,
      is_prefix: params.isPrefix,
      source: params.source,
      source_detail: params.sourceDetail ?? null,
      status: "pending",
    });

    if (error) {
      logger.warn(
        { action: "enqueueStorageDeletion", err: error, ...params },
        "削除キューへの登録に失敗しました"
      );
    }
  } catch (error) {
    logger.warn(
      { action: "enqueueStorageDeletion", err: error, ...params },
      "削除キューへの登録に失敗しました"
    );
  }
}

/**
 * 複数の削除をまとめてキューに登録する。
 */
export async function enqueueStorageDeletionBatch(
  items: EnqueueParams[]
): Promise<void> {
  if (items.length === 0) return;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("storage_deletion_queue").insert(
      items.map((params) => ({
        storage_type: params.storageType,
        bucket: params.bucket,
        path: params.path,
        is_prefix: params.isPrefix,
        source: params.source,
        source_detail: params.sourceDetail ?? null,
        status: "pending",
      }))
    );

    if (error) {
      logger.warn(
        { action: "enqueueStorageDeletionBatch", err: error, count: items.length },
        "削除キューへの一括登録に失敗しました"
      );
    }
  } catch (error) {
    logger.warn(
      { action: "enqueueStorageDeletionBatch", err: error, count: items.length },
      "削除キューへの一括登録に失敗しました"
    );
  }
}

/**
 * キュー内の承認済みアイテムを実行する。
 * @returns 処理結果サマリ
 */
export async function executeApprovedDeletions(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const supabase = createAdminClient();
  const { data: items, error } = await supabase
    .from("storage_deletion_queue")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error || !items || items.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const item of items) {
    try {
      if (item.storage_type === "s3") {
        if (item.is_prefix) {
          await deleteS3Prefix(item.bucket, item.path);
        } else {
          await deleteS3Object(item.bucket, item.path);
        }
      } else {
        if (item.is_prefix) {
          await deleteSupabaseStoragePrefix(item.bucket, item.path);
        } else {
          await deleteSupabaseStorageFiles(item.bucket, [item.path]);
        }
      }

      await supabase
        .from("storage_deletion_queue")
        .update({
          status: "completed",
          executed_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      succeeded++;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "不明なエラー";

      await supabase
        .from("storage_deletion_queue")
        .update({
          status: "failed",
          executed_at: new Date().toISOString(),
          error_message: errorMessage,
        })
        .eq("id", item.id);

      failed++;
      logger.warn(
        { action: "executeApprovedDeletions", err, itemId: item.id },
        "キューアイテムの実行に失敗しました"
      );
    }
  }

  return { processed: items.length, succeeded, failed };
}
