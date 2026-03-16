import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Supabase Storage の公開 URL からバケット内パスを抽出する。
 * URL 形式: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
 * @returns パス文字列、または抽出できない場合は null
 */
export function extractSupabaseStoragePath(
  publicUrl: string,
  bucket: string
): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.substring(idx + marker.length);
}

/**
 * Supabase Storage の指定パスのファイルを削除する。
 * 空配列の場合は何もしない。
 */
export async function deleteSupabaseStorageFiles(
  bucket: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return;

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      logger.warn(
        { action: "deleteSupabaseStorageFiles", bucket, paths, err: error },
        "Supabase Storageファイルの削除に失敗しました"
      );
      return;
    }
    logger.info(
      { action: "deleteSupabaseStorageFiles", bucket, count: paths.length },
      "Supabase Storageファイルを削除しました"
    );
  } catch (error) {
    logger.warn(
      { action: "deleteSupabaseStorageFiles", bucket, paths, err: error },
      "Supabase Storageファイルの削除に失敗しました"
    );
  }
}

/**
 * Supabase Storage のプレフィックス配下を一括削除する。
 * list() でファイル一覧を取得してから remove() で削除する。
 */
export async function deleteSupabaseStoragePrefix(
  bucket: string,
  prefix: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(prefix);

    if (listError) {
      logger.warn(
        { action: "deleteSupabaseStoragePrefix", bucket, prefix, err: listError },
        "Supabase Storageファイル一覧の取得に失敗しました"
      );
      return;
    }

    if (!files || files.length === 0) return;

    const paths = files.map((f) => `${prefix}${f.name}`);
    await deleteSupabaseStorageFiles(bucket, paths);
  } catch (error) {
    logger.warn(
      { action: "deleteSupabaseStoragePrefix", bucket, prefix, err: error },
      "Supabase Storageプレフィックス配下の削除に失敗しました"
    );
  }
}
