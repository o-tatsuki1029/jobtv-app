"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { logger } from "@/lib/logger";
import { enqueueStorageDeletion } from "@/lib/storage/deletion-queue";
import { extractSupabaseStoragePath } from "@/lib/storage/storage-cleanup";

const ALLOWED_VIDEO_MIME = ["video/mp4"];
const ALLOWED_THUMBNAIL_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB

type LpSampleVideoRow = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  tag: string;
  title: string;
  description: string;
  duration: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

/** 公開用: display_order 昇順で全件取得 */
export async function getLpSampleVideos(): Promise<{
  data: LpSampleVideoRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lp_sample_videos")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getLpSampleVideos", err: e }, "LPサンプル動画の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Admin用: display_order 昇順で全件取得 */
export async function getAdminLpSampleVideos(): Promise<{
  data: LpSampleVideoRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lp_sample_videos")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getAdminLpSampleVideos", err: e }, "管理画面LPサンプル動画の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** 新規作成 */
export async function createLpSampleVideo(formData: FormData): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  const tag = formData.get("tag");
  const title = formData.get("title");
  const description = formData.get("description");
  const duration = formData.get("duration");
  const file = formData.get("file");
  const thumbnailFile = formData.get("thumbnail");

  if (!tag || typeof tag !== "string" || tag.trim() === "") {
    return { data: null, error: "タグを入力してください" };
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    return { data: null, error: "タイトルを入力してください" };
  }
  if (!description || typeof description !== "string" || description.trim() === "") {
    return { data: null, error: "説明を入力してください" };
  }
  const durationValue = (typeof duration === "string" && duration.trim() !== "") ? duration.trim() : "00:00";
  if (!file || !(file instanceof File)) {
    return { data: null, error: "動画ファイルを選択してください" };
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return { data: null, error: "ファイルサイズは50MB以下にしてください" };
  }
  if (!ALLOWED_VIDEO_MIME.includes(file.type)) {
    return { data: null, error: "MP4 形式のみアップロードできます" };
  }
  if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
    if (thumbnailFile.size > MAX_THUMBNAIL_SIZE) {
      return { data: null, error: "サムネイルは5MB以下にしてください" };
    }
    if (!ALLOWED_THUMBNAIL_MIME.includes(thumbnailFile.type)) {
      return { data: null, error: "サムネイルは JPEG, PNG, WebP 形式のみです" };
    }
  }

  try {
    const supabase = createAdminClient();
    const { randomUUID } = await import("crypto");
    const id = randomUUID();
    const timestamp = Date.now();
    const fileName = `admin/lp-videos/${id}/${timestamp}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      logger.error({ action: "createLpSampleVideo", err: uploadError }, "LP動画のアップロードに失敗しました");
      return { data: null, error: uploadError.message };
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    let thumbnailUrl: string | null = null;
    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      const thumbExt = thumbnailFile.name.split(".").pop() || "jpg";
      const thumbFileName = `admin/lp-videos/${id}/${timestamp}_thumb.${thumbExt}`;
      const { error: thumbError } = await supabase.storage
        .from("company-assets")
        .upload(thumbFileName, thumbnailFile, { cacheControl: "3600", upsert: false });
      if (!thumbError) {
        thumbnailUrl = supabase.storage.from("company-assets").getPublicUrl(thumbFileName).data.publicUrl;
      }
    }

    const { data: maxOrder } = await supabase
      .from("lp_sample_videos")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insertError } = await supabase.from("lp_sample_videos").insert({
      id,
      video_url: publicUrl,
      thumbnail_url: thumbnailUrl,
      tag: tag.trim(),
      title: title.trim(),
      description: description.trim(),
      duration: durationValue,
      display_order: nextOrder
    });

    if (insertError) {
      logger.error({ action: "createLpSampleVideo", err: insertError }, "LP動画レコードの挿入に失敗しました");
      return { data: null, error: insertError.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "lp_video.create",
        category: "content_edit",
        resourceType: "lp_sample_videos",
        resourceId: id,
        app: "jobtv",
        metadata: { title: title.trim(), tag: tag.trim() },
      });
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: { id }, error: null };
  } catch (e) {
    logger.error({ action: "createLpSampleVideo", err: e }, "LP動画の作成に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "作成に失敗しました" };
  }
}

/** 更新 */
export async function updateLpSampleVideo(
  id: string,
  formData: FormData
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  const tag = formData.get("tag");
  const title = formData.get("title");
  const description = formData.get("description");
  const duration = formData.get("duration");
  const file = formData.get("file");
  const thumbnailFile = formData.get("thumbnail");

  if (!tag || typeof tag !== "string" || tag.trim() === "") {
    return { data: null, error: "タグを入力してください" };
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    return { data: null, error: "タイトルを入力してください" };
  }
  if (!description || typeof description !== "string" || description.trim() === "") {
    return { data: null, error: "説明を入力してください" };
  }
  const durationValue = (typeof duration === "string" && duration.trim() !== "") ? duration.trim() : "00:00";

  try {
    const supabase = createAdminClient();

    // 旧ファイルURL取得（差し替え時の旧ファイル削除用）
    const { data: currentRecord } = await supabase
      .from("lp_sample_videos")
      .select("video_url, thumbnail_url")
      .eq("id", id)
      .maybeSingle();

    const updates: Record<string, unknown> = {
      tag: tag.trim(),
      title: title.trim(),
      description: description.trim(),
      duration: durationValue,
      updated_at: new Date().toISOString()
    };

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_VIDEO_SIZE) {
        return { data: null, error: "ファイルサイズは50MB以下にしてください" };
      }
      if (!ALLOWED_VIDEO_MIME.includes(file.type)) {
        return { data: null, error: "MP4 形式のみアップロードできます" };
      }

      const timestamp = Date.now();
      const fileName = `admin/lp-videos/${id}/${timestamp}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        logger.error({ action: "updateLpSampleVideo", err: uploadError }, "LP動画のアップロードに失敗しました");
        return { data: null, error: uploadError.message };
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("company-assets").getPublicUrl(fileName);

      updates.video_url = publicUrl;
    }

    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      if (thumbnailFile.size > MAX_THUMBNAIL_SIZE) {
        return { data: null, error: "サムネイルは5MB以下にしてください" };
      }
      if (!ALLOWED_THUMBNAIL_MIME.includes(thumbnailFile.type)) {
        return { data: null, error: "サムネイルは JPEG, PNG, WebP 形式のみです" };
      }
      const timestamp = Date.now();
      const thumbExt = thumbnailFile.name.split(".").pop() || "jpg";
      const thumbFileName = `admin/lp-videos/${id}/${timestamp}_thumb.${thumbExt}`;
      const { error: thumbError } = await supabase.storage
        .from("company-assets")
        .upload(thumbFileName, thumbnailFile, { cacheControl: "3600", upsert: false });
      if (!thumbError) {
        updates.thumbnail_url = supabase.storage.from("company-assets").getPublicUrl(thumbFileName).data.publicUrl;
      }
    }

    const { error: updateError } = await supabase
      .from("lp_sample_videos")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.error({ action: "updateLpSampleVideo", err: updateError }, "LP動画の更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "lp_video.update",
        category: "content_edit",
        resourceType: "lp_sample_videos",
        resourceId: id,
        app: "jobtv",
        metadata: { lpSampleVideoId: id },
      });
    }

    // 旧ファイル削除をキューに登録
    if (updates.video_url && currentRecord?.video_url) {
      const oldPath = extractSupabaseStoragePath(currentRecord.video_url, "company-assets");
      if (oldPath) {
        void enqueueStorageDeletion({
          storageType: "supabase",
          bucket: "company-assets",
          path: oldPath,
          isPrefix: false,
          source: "update_lp_sample_video",
          sourceDetail: `lpSampleVideoId=${id}`,
        });
      }
    }
    if (updates.thumbnail_url && currentRecord?.thumbnail_url) {
      const oldPath = extractSupabaseStoragePath(currentRecord.thumbnail_url, "company-assets");
      if (oldPath) {
        void enqueueStorageDeletion({
          storageType: "supabase",
          bucket: "company-assets",
          path: oldPath,
          isPrefix: false,
          source: "update_lp_sample_video_thumbnail",
          sourceDetail: `lpSampleVideoId=${id}`,
        });
      }
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "updateLpSampleVideo", err: e }, "LP動画の更新に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "更新に失敗しました" };
  }
}

/** 削除 */
export async function deleteLpSampleVideo(
  id: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("lp_sample_videos").delete().eq("id", id);

    if (error) {
      logger.error({ action: "deleteLpSampleVideo", err: error }, "LP動画の削除に失敗しました");
      return { data: null, error: error.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "lp_video.delete",
        category: "content_edit",
        resourceType: "lp_sample_videos",
        resourceId: id,
        app: "jobtv",
        metadata: { lpSampleVideoId: id },
      });
    }

    // Supabase Storage 削除をキューに登録
    void enqueueStorageDeletion({
      storageType: "supabase",
      bucket: "company-assets",
      path: `admin/lp-videos/${id}/`,
      isPrefix: true,
      source: "delete_lp_sample_video",
      sourceDetail: `lpSampleVideoId=${id}`,
    });

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "deleteLpSampleVideo", err: e }, "LP動画の削除に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}

/** 並び替え */
export async function reorderLpSampleVideos(
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
        .from("lp_sample_videos")
        .update({ display_order: i })
        .eq("id", orderedIds[i]);

      if (error) {
        logger.error({ action: "reorderLpSampleVideos", err: error }, "LP動画の並び替えに失敗しました");
        return { data: null, error: error.message };
      }
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "lp_videos.reorder",
        category: "content_edit",
        resourceType: "lp_sample_videos",
        app: "jobtv",
        metadata: { orderedIds },
      });
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "reorderLpSampleVideos", err: e }, "LP動画の並び替えに失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "並び替えに失敗しました" };
  }
}
