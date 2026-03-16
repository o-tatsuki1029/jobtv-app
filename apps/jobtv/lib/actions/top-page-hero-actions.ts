"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { createVideoPresignedUrl } from "@/lib/aws/s3-presigned";
import { createHeroMediaConvertJob, getMediaConvertJobStatus } from "@/lib/aws/mediaconvert-client";
import { getHeroHlsManifestUrl, getHeroMediaConvertThumbnailUrl } from "@/lib/aws/cloudfront-client";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { logger } from "@/lib/logger";
import { enqueueStorageDeletion, enqueueStorageDeletionBatch } from "@/lib/storage/deletion-queue";
import { extractSupabaseStoragePath } from "@/lib/storage/storage-cleanup";
import crypto from "crypto";

const ALLOWED_HERO_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_HERO_SIZE = 5 * 1024 * 1024; // 5MB

type HeroItemRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  auto_thumbnail_url: string | null;
  is_converted: boolean;
  mediaconvert_job_id: string | null;
  video_url: string | null;
  is_pr: boolean;
  link_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

function validateCommonFields(
  title: FormDataEntryValue | null,
  linkUrl: FormDataEntryValue | null
): string | null {
  if (!title || typeof title !== "string" || title.trim() === "") {
    return "タイトルを入力してください";
  }
  if (title.trim().length > 32) {
    return "タイトルは32文字以内で入力してください";
  }
  if (!linkUrl || typeof linkUrl !== "string" || linkUrl.trim() === "") {
    return "URLを入力してください";
  }
  try {
    new URL(linkUrl.trim());
  } catch {
    return "URLは有効なURL形式で入力してください";
  }
  return null;
}

/** トップページ公開用: is_converted=true のみ display_order 昇順で取得 */
export async function getTopPageHeroItems(): Promise<{
  data: HeroItemRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("top_page_hero_items")
      .select("*")
      .eq("is_converted", true)
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getTopPageHeroItems", err: e }, "ヒーローアイテムの取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Admin管理画面用: display_order 昇順で全件取得 + 変換状況確認 */
export async function getAdminTopPageHeroItems(): Promise<{
  data: HeroItemRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("top_page_hero_items")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };

    const items = (data ?? []) as HeroItemRow[];

    // is_converted=false かつ mediaconvert_job_id がある items の変換状況を確認
    const pendingItems = items.filter((i) => !i.is_converted && i.mediaconvert_job_id);
    await Promise.all(
      pendingItems.map(async (item) => {
        const statusResult = await getMediaConvertJobStatus(item.mediaconvert_job_id!);
        if (statusResult.status === "COMPLETE") {
          await supabase
            .from("top_page_hero_items")
            .update({ is_converted: true })
            .eq("id", item.id);
          item.is_converted = true;
        }
      })
    );

    return { data: items, error: null };
  } catch (e) {
    logger.error({ action: "getAdminTopPageHeroItems", err: e }, "管理用ヒーローアイテムの取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** ヒーローアイテムを新規作成 */
export async function createTopPageHeroItem(formData: FormData): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  const title = formData.get("title");
  const isPrRaw = formData.get("is_pr");
  const linkUrl = formData.get("link_url");
  const videoFile = formData.get("video_file");
  const file = formData.get("thumbnail_file");

  const validationError = validateCommonFields(title, linkUrl);
  if (validationError) return { data: null, error: validationError };

  // video_url / mediaconvert_job_id / auto_thumbnail_url はクライアントが
  // Presigned URL アップロード＋confirmHeroVideoUpload() で取得して FormData に含める
  const videoUrl = formData.get("video_url");
  const mediaconvertJobId = formData.get("mediaconvert_job_id");
  const autoThumbnailUrlField = formData.get("auto_thumbnail_url");

  if (!videoUrl || typeof videoUrl !== "string" || videoUrl.trim() === "") {
    return { data: null, error: "動画をアップロードしてください" };
  }

  // サムネイルがある場合はバリデーション
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_HERO_SIZE) {
      return { data: null, error: "ファイルサイズは5MB以下にしてください" };
    }
    if (!ALLOWED_HERO_MIME.includes(file.type)) {
      return { data: null, error: "JPEG, PNG, WebP 形式のみアップロードできます" };
    }
  }

  try {
    const supabase = createAdminClient();

    // クライアントが Presigned URL 用に事前生成した ID を使用（なければサーバーで生成）
    const clientId = formData.get("hero_item_id");
    const id = typeof clientId === "string" && clientId.trim() !== ""
      ? clientId.trim()
      : crypto.randomUUID();

    // サムネイルのアップロード（任意）
    let publicUrl: string | null = null;
    if (file instanceof File && file.size > 0) {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `admin/hero-items/${id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        logger.error({ action: "createTopPageHeroItem", err: uploadError }, "サムネ画像のアップロードに失敗しました");
        return { data: null, error: uploadError.message };
      }

      const {
        data: { publicUrl: url }
      } = supabase.storage.from("company-assets").getPublicUrl(fileName);
      publicUrl = url;
    }

    // 動画情報はクライアントが Presigned URL + confirmHeroVideoUpload() で取得済み
    const isConverted = false;
    const resolvedAutoThumbnailUrl = typeof autoThumbnailUrlField === "string" ? autoThumbnailUrlField : null;

    const { data: maxOrder } = await supabase
      .from("top_page_hero_items")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insertError } = await supabase.from("top_page_hero_items").insert({
      id,
      title: (title as string).trim(),
      thumbnail_url: publicUrl,
      auto_thumbnail_url: resolvedAutoThumbnailUrl,
      is_converted: isConverted,
      mediaconvert_job_id: typeof mediaconvertJobId === "string" ? mediaconvertJobId : null,
      video_url: (videoUrl as string).trim(),
      is_pr: isPrRaw === "on" || isPrRaw === "true",
      link_url: linkUrl && typeof linkUrl === "string" && linkUrl.trim() !== "" ? linkUrl.trim() : null,
      display_order: nextOrder
    });

    if (insertError) {
      logger.error({ action: "createTopPageHeroItem", err: insertError }, "ヒーローアイテムのDB挿入に失敗しました");
      return { data: null, error: insertError.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "hero_item.create",
        category: "hero",
        resourceType: "top_page_hero_items",
        resourceId: id,
        app: "jobtv",
        metadata: { title: (title as string).trim(), linkUrl: (linkUrl as string).trim() },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/hero-items");
    return { data: { id }, error: null };
  } catch (e) {
    logger.error({ action: "createTopPageHeroItem", err: e }, "ヒーローアイテムの作成中に例外が発生しました");
    return { data: null, error: e instanceof Error ? e.message : "作成に失敗しました" };
  }
}

/** ヒーローアイテムを更新 */
export async function updateTopPageHeroItem(
  id: string,
  formData: FormData
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  const title = formData.get("title");
  const isPrRaw = formData.get("is_pr");
  const linkUrl = formData.get("link_url");
  const videoFile = formData.get("video_file");
  const file = formData.get("thumbnail_file");

  const validationError = validateCommonFields(title, linkUrl);
  if (validationError) return { data: null, error: validationError };

  try {
    const supabase = createAdminClient();

    // 旧サムネイルURLを事前取得（ファイル差し替え時の旧ファイル削除用）
    const { data: currentItem } = await supabase
      .from("top_page_hero_items")
      .select("thumbnail_url")
      .eq("id", id)
      .maybeSingle();

    const updates: Record<string, unknown> = {
      title: (title as string).trim(),
      is_pr: isPrRaw === "on" || isPrRaw === "true",
      link_url: linkUrl && typeof linkUrl === "string" && linkUrl.trim() !== "" ? linkUrl.trim() : null,
      updated_at: new Date().toISOString()
    };

    // 動画がクライアントから Presigned URL で再アップロードされた場合、
    // FormData に video_url / mediaconvert_job_id / auto_thumbnail_url が含まれる
    const newVideoUrl = formData.get("video_url");
    const newJobId = formData.get("mediaconvert_job_id");
    const newAutoThumbnail = formData.get("auto_thumbnail_url");
    if (newVideoUrl && typeof newVideoUrl === "string" && newVideoUrl.trim() !== "") {
      updates.video_url = newVideoUrl.trim();
      updates.is_converted = false;
      updates.mediaconvert_job_id = typeof newJobId === "string" ? newJobId : null;
      updates.auto_thumbnail_url = typeof newAutoThumbnail === "string" ? newAutoThumbnail : null;
    }

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_HERO_SIZE) {
        return { data: null, error: "ファイルサイズは5MB以下にしてください" };
      }
      if (!ALLOWED_HERO_MIME.includes(file.type)) {
        return { data: null, error: "JPEG, PNG, WebP 形式のみアップロードできます" };
      }

      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `admin/hero-items/${id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        logger.error({ action: "updateTopPageHeroItem", err: uploadError }, "サムネ画像のアップロードに失敗しました");
        return { data: null, error: uploadError.message };
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("company-assets").getPublicUrl(fileName);

      updates.thumbnail_url = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("top_page_hero_items")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.error({ action: "updateTopPageHeroItem", err: updateError, id }, "ヒーローアイテムのDB更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    // サムネイル差し替え時、旧ファイル削除をキューに登録
    if (updates.thumbnail_url && currentItem?.thumbnail_url) {
      const oldPath = extractSupabaseStoragePath(currentItem.thumbnail_url, "company-assets");
      if (oldPath) {
        void enqueueStorageDeletion({
          storageType: "supabase",
          bucket: "company-assets",
          path: oldPath,
          isPrefix: false,
          source: "update_hero_thumbnail",
          sourceDetail: `heroItemId=${id}`,
        });
      }
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "hero_item.update",
        category: "hero",
        resourceType: "top_page_hero_items",
        resourceId: id,
        app: "jobtv",
        metadata: { heroItemId: id },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/hero-items");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "updateTopPageHeroItem", err: e }, "ヒーローアイテムの更新中に例外が発生しました");
    return { data: null, error: e instanceof Error ? e.message : "更新に失敗しました" };
  }
}

/** ヒーローアイテムを削除 */
export async function deleteTopPageHeroItem(
  id: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  try {
    const supabase = createAdminClient();

    // 削除前にタイトルとサムネイルURLを取得（監査ログ + ストレージ削除用）
    const { data: heroItem } = await supabase
      .from("top_page_hero_items")
      .select("title, thumbnail_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabase.from("top_page_hero_items").delete().eq("id", id);

    if (error) {
      logger.error({ action: "deleteTopPageHeroItem", err: error, id }, "ヒーローアイテムの削除に失敗しました");
      return { data: null, error: error.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "hero_item.delete",
        category: "hero",
        resourceType: "top_page_hero_items",
        resourceId: id,
        app: "jobtv",
        metadata: { heroItemId: id, title: heroItem?.title ?? null },
      });
    }

    // ストレージ削除をキューに登録（管理者承認後に実行）
    const s3Bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    void enqueueStorageDeletionBatch([
      {
        storageType: "s3",
        bucket: s3Bucket,
        path: `admin/hero-items/${id}/`,
        isPrefix: true,
        source: "delete_hero_item",
        sourceDetail: `heroItemId=${id}`,
      },
      {
        storageType: "supabase",
        bucket: "company-assets",
        path: `admin/hero-items/${id}/`,
        isPrefix: true,
        source: "delete_hero_item",
        sourceDetail: `heroItemId=${id}`,
      },
    ]);

    revalidatePath("/");
    revalidatePath("/admin/hero-items");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "deleteTopPageHeroItem", err: e }, "ヒーローアイテムの削除中に例外が発生しました");
    return { data: null, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}

/** 表示順を一括更新。orderedIds は id の配列 */
export async function reorderTopPageHeroItems(
  orderedIds: string[]
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  if (orderedIds.length === 0) return { data: true, error: null };

  try {
    const supabase = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("top_page_hero_items")
        .update({ display_order: i })
        .eq("id", orderedIds[i]);

      if (error) {
        logger.error({ action: "reorderTopPageHeroItems", err: error }, "ヒーローアイテムの並び替え更新に失敗しました");
        return { data: null, error: error.message };
      }
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "hero_item.reorder",
        category: "hero",
        resourceType: "top_page_hero_items",
        app: "jobtv",
        metadata: { orderedIds },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/hero-items");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "reorderTopPageHeroItems", err: e }, "ヒーローアイテムの並び替え中に例外が発生しました");
    return { data: null, error: e instanceof Error ? e.message : "並び替えに失敗しました" };
  }
}

/**
 * ヒーロー動画アップロード用の Presigned URL を取得する Server Action
 */
export async function getHeroVideoPresignedUrl(
  fileName: string,
  contentType: string,
  fileSize: number,
  heroItemId: string
): Promise<{
  data: { presignedUrl: string; s3Key: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const fileExt = fileName.split(".").pop()?.toLowerCase() || "mp4";
    const s3Key = `admin/hero-items/${heroItemId}/original.${fileExt}`;

    const result = await createVideoPresignedUrl({
      s3Key,
      contentType,
      fileSize,
      metadata: {
        heroItemId,
        originalFileName: crypto.randomBytes(16).toString("hex"),
        uploadedAt: new Date().toISOString()
      }
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    return {
      data: { presignedUrl: result.presignedUrl!, s3Key },
      error: null
    };
  } catch (e) {
    logger.error({ action: "getHeroVideoPresignedUrl", err: e }, "Presigned URL取得失敗");
    return { data: null, error: e instanceof Error ? e.message : "アップロードURLの取得に失敗しました" };
  }
}

/**
 * ヒーロー動画のクライアント直接アップロード完了後に呼び出す Server Action。
 * MediaConvert ジョブを起動し DB を更新する。
 */
export async function confirmHeroVideoUpload(
  s3Key: string,
  heroItemId: string
): Promise<{
  data: { videoUrl: string; jobId?: string; autoThumbnailUrl: string | null } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const jobResult = await createHeroMediaConvertJob(heroItemId, s3Key);
    if (jobResult.error) {
      logger.error({ action: "confirmHeroVideoUpload", err: jobResult.error, heroItemId }, "MediaConvertジョブの起動に失敗しました");
      return { data: null, error: `MediaConvertジョブの起動に失敗しました: ${jobResult.error}` };
    }

    let videoUrl: string;
    try {
      videoUrl = await getHeroHlsManifestUrl(heroItemId);
    } catch (e) {
      logger.error({ action: "confirmHeroVideoUpload", err: e }, "HLS URLの生成に失敗しました");
      return { data: null, error: e instanceof Error ? e.message : "HLS URLの生成に失敗しました" };
    }

    const autoThumbnailUrl = await getHeroMediaConvertThumbnailUrl(heroItemId);

    return {
      data: {
        videoUrl,
        jobId: jobResult.jobId,
        autoThumbnailUrl
      },
      error: null
    };
  } catch (e) {
    logger.error({ action: "confirmHeroVideoUpload", err: e }, "ヒーロー動画アップロード確認処理に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "アップロードの確認に失敗しました" };
  }
}
