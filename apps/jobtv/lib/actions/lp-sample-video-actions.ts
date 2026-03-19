"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { logger } from "@/lib/logger";
import { enqueueStorageDeletion } from "@/lib/storage/deletion-queue";
import { createVideoPresignedUrl } from "@/lib/aws/s3-presigned";
import { createLpVideoMediaConvertJob, getMediaConvertJobStatus } from "@/lib/aws/mediaconvert-client";
import { getLpVideoHlsManifestUrl, getLpVideoMediaConvertThumbnailUrl } from "@/lib/aws/cloudfront-client";

type LpSampleVideoRow = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  hls_url: string | null;
  auto_thumbnail_url: string | null;
  conversion_status: string | null;
  conversion_job_id: string | null;
  s3_key: string | null;
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

/** Admin用: display_order 昇順で全件取得（変換中のステータスも更新） */
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

    // 変換中のアイテムのステータスを更新
    const pendingItems = (data ?? []).filter(
      (v) => v.conversion_status === "processing" && v.conversion_job_id
    );
    for (const item of pendingItems) {
      await checkAndUpdateLpVideoConversion(item.id, item.conversion_job_id!);
    }

    // ステータス更新後に再取得
    if (pendingItems.length > 0) {
      const { data: refreshed, error: refreshErr } = await supabase
        .from("lp_sample_videos")
        .select("*")
        .order("display_order", { ascending: true });
      if (!refreshErr) return { data: refreshed ?? [], error: null };
    }

    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getAdminLpSampleVideos", err: e }, "管理画面LPサンプル動画の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Presigned URL を取得（S3 直接アップロード用） */
export async function getLpVideoPresignedUrl(
  lpVideoId: string,
  fileName: string,
  fileType: string,
  fileSize: number
): Promise<{
  data: { presignedUrl: string; s3Key: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const ext = fileName.split(".").pop()?.toLowerCase() || "mp4";
    const s3Key = `admin/lp-videos/${lpVideoId}/original.${ext}`;

    const result = await createVideoPresignedUrl({
      s3Key,
      contentType: fileType,
      fileSize,
      metadata: {
        lpVideoId,
        uploadedAt: new Date().toISOString()
      }
    });

    if (result.error || !result.presignedUrl) {
      return { data: null, error: result.error || "Presigned URLの取得に失敗しました" };
    }

    return { data: { presignedUrl: result.presignedUrl, s3Key }, error: null };
  } catch (e) {
    logger.error({ action: "getLpVideoPresignedUrl", lpVideoId, err: e }, "LP動画Presigned URL取得に失敗");
    return { data: null, error: e instanceof Error ? e.message : "Presigned URLの取得に失敗しました" };
  }
}

/** S3アップロード完了後にMediaConvert変換を開始 */
export async function confirmLpVideoUpload(
  lpVideoId: string,
  s3Key: string
): Promise<{
  data: { jobId: string; hlsUrl: string; autoThumbnailUrl: string | null } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const jobResult = await createLpVideoMediaConvertJob(lpVideoId, s3Key);
    if (jobResult.error || !jobResult.jobId) {
      return { data: null, error: jobResult.error || "MediaConvertジョブの作成に失敗しました" };
    }

    const hlsUrl = await getLpVideoHlsManifestUrl(lpVideoId);
    const autoThumbnailUrl = await getLpVideoMediaConvertThumbnailUrl(lpVideoId);

    return {
      data: {
        jobId: jobResult.jobId,
        hlsUrl,
        autoThumbnailUrl
      },
      error: null
    };
  } catch (e) {
    logger.error({ action: "confirmLpVideoUpload", lpVideoId, err: e }, "LP動画変換開始に失敗");
    return { data: null, error: e instanceof Error ? e.message : "変換開始に失敗しました" };
  }
}

/** 新規作成（メタデータのみ。動画はクライアントからS3に直接アップロード） */
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
  const videoUrl = formData.get("video_url");
  const hlsUrl = formData.get("hls_url");
  const s3Key = formData.get("s3_key");
  const conversionJobId = formData.get("conversion_job_id");
  const autoThumbnailUrl = formData.get("auto_thumbnail_url");

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
    const { randomUUID } = await import("crypto");
    const id = formData.get("id") as string || randomUUID();

    const { data: maxOrder } = await supabase
      .from("lp_sample_videos")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insertError } = await supabase.from("lp_sample_videos").insert({
      id,
      video_url: typeof videoUrl === "string" ? videoUrl : "",
      thumbnail_url: null,
      hls_url: typeof hlsUrl === "string" ? hlsUrl : null,
      auto_thumbnail_url: typeof autoThumbnailUrl === "string" ? autoThumbnailUrl : null,
      conversion_status: conversionJobId ? "processing" : null,
      conversion_job_id: typeof conversionJobId === "string" ? conversionJobId : null,
      s3_key: typeof s3Key === "string" ? s3Key : null,
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

    const updates: Record<string, unknown> = {
      tag: tag.trim(),
      title: title.trim(),
      description: description.trim(),
      duration: durationValue,
      updated_at: new Date().toISOString()
    };

    // 動画を再アップロードした場合
    const newVideoUrl = formData.get("video_url");
    const newHlsUrl = formData.get("hls_url");
    const newS3Key = formData.get("s3_key");
    const newJobId = formData.get("conversion_job_id");
    const newAutoThumbnail = formData.get("auto_thumbnail_url");

    if (typeof newVideoUrl === "string" && newVideoUrl) {
      // 旧S3データの削除をキュー
      const { data: currentRecord } = await supabase
        .from("lp_sample_videos")
        .select("s3_key")
        .eq("id", id)
        .maybeSingle();

      if (currentRecord?.s3_key) {
        void enqueueStorageDeletion({
          storageType: "s3",
          bucket: process.env.AWS_S3_BUCKET || "jobtv-videos-stg",
          path: `admin/lp-videos/${id}/`,
          isPrefix: true,
          source: "update_lp_sample_video",
          sourceDetail: `lpSampleVideoId=${id}`,
        });
      }

      updates.video_url = newVideoUrl;
      updates.hls_url = typeof newHlsUrl === "string" ? newHlsUrl : null;
      updates.s3_key = typeof newS3Key === "string" ? newS3Key : null;
      updates.conversion_job_id = typeof newJobId === "string" ? newJobId : null;
      updates.conversion_status = newJobId ? "processing" : null;
      updates.auto_thumbnail_url = typeof newAutoThumbnail === "string" ? newAutoThumbnail : null;
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

    // S3削除をキュー
    const { data: record } = await supabase
      .from("lp_sample_videos")
      .select("s3_key")
      .eq("id", id)
      .maybeSingle();

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

    // S3削除キュー登録
    if (record?.s3_key) {
      void enqueueStorageDeletion({
        storageType: "s3",
        bucket: process.env.AWS_S3_BUCKET || "jobtv-videos-stg",
        path: `admin/lp-videos/${id}/`,
        isPrefix: true,
        source: "delete_lp_sample_video",
        sourceDetail: `lpSampleVideoId=${id}`,
      });
    }

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

/** MediaConvert変換ステータスを確認・更新 */
async function checkAndUpdateLpVideoConversion(
  id: string,
  jobId: string
): Promise<void> {
  try {
    const status = await getMediaConvertJobStatus(jobId);
    if (!status.status) return;

    const supabase = createAdminClient();

    if (status.status === "COMPLETE") {
      await supabase
        .from("lp_sample_videos")
        .update({ conversion_status: "completed" })
        .eq("id", id);
    } else if (status.status === "ERROR" || status.status === "CANCELED") {
      await supabase
        .from("lp_sample_videos")
        .update({ conversion_status: "failed" })
        .eq("id", id);
    }
  } catch (e) {
    logger.error({ action: "checkAndUpdateLpVideoConversion", id, err: e }, "LP動画変換ステータス確認失敗");
  }
}
