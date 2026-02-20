"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getUserInfo } from "@jobtv-app/shared/auth";
import { VIDEO_CATEGORIES } from "../../types/video.types";
import type {
  Video,
  VideoDraft,
  VideoDraftInsert,
  VideoDraftUpdate,
  VideoFormData,
  VideoCategory,
  VideoDraftItem
} from "../../types/video.types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";
import { uploadVideoToS3, uploadThumbnailToS3 } from "@/lib/aws/s3-client";
import { createMediaConvertJob } from "@/lib/aws/mediaconvert-client";

/**
 * ログイン企業の本番動画一覧を取得
 */
export async function getVideos(): Promise<{
  data: Video[] | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const userInfo = await getUserInfo();
    const isAdmin = userInfo?.role === "admin" || userInfo?.isAdmin;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .eq("company_id", companyId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get videos error:", error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Get videos error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "動画一覧の取得に失敗しました"
    };
  }
}

/**
 * ログイン企業の下書き動画一覧を取得
 */
export async function getVideosDraft(): Promise<{
  data: VideoDraftItem[] | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const userInfo = await getUserInfo();
    const isAdmin = userInfo?.role === "admin" || userInfo?.isAdmin;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    const { data, error } = await supabase
      .from("videos_draft")
      .select("*, videos!videos_draft_production_video_id_fkey(status)")
      .eq("company_id", companyId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get videos draft error:", error);
      return { data: null, error: error.message };
    }

    // productionのstatusを下書きデータに統合
    const formattedData = data?.map((draft: any) => ({
      ...draft,
      status: draft.videos?.status || "closed"
    })) as VideoDraftItem[];

    return { data: formattedData, error: null };
  } catch (error) {
    console.error("Get videos draft error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "下書き動画一覧の取得に失敗しました"
    };
  }
}

/**
 * 特定の下書き動画を取得
 */
export async function getVideoDraftById(id: string): Promise<{
  data: VideoDraftItem | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const userInfo = await getUserInfo();
    const isAdmin = userInfo?.role === "admin" || userInfo?.isAdmin;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    const { data, error } = await supabase
      .from("videos_draft")
      .select("*, videos!videos_draft_production_video_id_fkey(status)")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (error) {
      console.error("Get video draft by id error:", error);
      return { data: null, error: error.message };
    }

    const formattedData = {
      ...data,
      status: (data as any).videos?.status || "closed"
    } as VideoDraftItem;

    return { data: formattedData, error: null };
  } catch (error) {
    console.error("Get video draft by id error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "下書き動画の取得に失敗しました"
    };
  }
}

/**
 * 下書き動画を作成
 */
export async function createVideoDraft(formData: VideoFormData): Promise<{
  data: VideoDraftItem | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    // バリデーション
    if (!formData.title || formData.title.trim() === "") {
      return { data: null, error: "タイトルは必須項目です" };
    }
    if (formData.title.length > 30) {
      return { data: null, error: "タイトルは30文字以内で入力してください" };
    }
    if (!formData.video_url || formData.video_url.trim() === "") {
      return { data: null, error: "動画URLは必須項目です" };
    }

    // カテゴリーごとの登録数チェック
    const categoryInfo = VIDEO_CATEGORIES.find((c) => c.id === formData.category);
    if (categoryInfo?.maxCount) {
      const { data: existingDrafts, error: draftsError } = await getVideosDraft();
      const { data: existingProduction, error: productionError } = await getVideos();

      if (draftsError || productionError) {
        return { data: null, error: draftsError || productionError };
      }

      // 却下されていない下書きと、本番の動画をカウント
      // ただし、既に本番にある動画の更新用下書き（production_video_idがあるもの）は二重カウントしない
      const draftCount =
        existingDrafts?.filter(
          (v) => v.category === formData.category && v.draft_status !== "rejected" && !v.production_video_id
        ).length || 0;

      const productionCount = existingProduction?.filter((v) => v.category === formData.category).length || 0;

      if (draftCount + productionCount >= categoryInfo.maxCount) {
        return {
          data: null,
          error: `${categoryInfo.label}は最大${categoryInfo.maxCount}つまで登録可能です。既に登録されている動画を削除してから追加してください。`
        };
      }
    }

    const userInfo = await getUserInfo();
    const isAdmin = userInfo?.role === "admin" || userInfo?.isAdmin;
    const supabase = isAdmin ? createAdminClient() : await createClient();
    const clientForAuth = await createClient(); // user IDはセッションが必要なのでcreateClientを使用

    const {
      data: { user }
    } = await clientForAuth.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    const draftData: VideoDraftInsert = {
      company_id: companyId,
      title: formData.title,
      video_url: formData.video_url,
      thumbnail_url: formData.thumbnail_url || null,
      category: formData.category,
      display_order: formData.display_order || 0,
      draft_status: "draft",
      created_by: user.id
    };

    const { data, error } = await supabase.from("videos_draft").insert(draftData).select().single();

    if (error) {
      console.error("Create video draft error:", error);
      return { data: null, error: error.message };
    }

    // 新規作成の場合、video_urlから一時的なIDを推測してジョブIDを更新
    // video_urlの形式: .../source/{landscape|portrait}/{companyId}/videos/{tempId}/...
    // 一時IDでジョブIDを検索して更新（SNS通知で更新される可能性もある）
    if (data.video_url && data.video_url.includes("/videos/")) {
      const urlMatch = data.video_url.match(/\/videos\/([^/]+)\//);
      if (urlMatch && urlMatch[1].startsWith("temp-")) {
        // 一時IDを含むvideo_urlで検索してジョブIDを更新
        // 注意: この時点ではジョブIDが保存されていない可能性がある
        // SNS通知で自動更新されるか、手動で更新する必要がある
      }
    }

    const formattedData = {
      ...data,
      status: "closed"
    } as VideoDraftItem;

    revalidatePath("/studio/videos");
    return { data: formattedData, error: null };
  } catch (error) {
    console.error("Create video draft error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "下書き動画の作成に失敗しました"
    };
  }
}

/**
 * 下書き動画を更新
 */
export async function updateVideoDraft(
  id: string,
  formData: Partial<VideoFormData>
): Promise<{
  data: VideoDraftItem | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    const supabase = await createClient();

    // 現在のdraftを取得して、draft_statusを確認
    const { data: currentDraft, error: fetchError } = await supabase
      .from("videos_draft")
      .select("draft_status, category, production_video_id")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (fetchError) {
      console.error("Get current draft error:", fetchError);
      return { data: null, error: fetchError.message };
    }

    // カテゴリーが変更される場合、変更後のカテゴリーの登録数チェック
    if (formData.category && formData.category !== currentDraft.category) {
      const categoryInfo = VIDEO_CATEGORIES.find((c) => c.id === formData.category);
      if (categoryInfo?.maxCount) {
        const { data: existingDrafts, error: draftsError } = await getVideosDraft();
        const { data: existingProduction, error: productionError } = await getVideos();

        if (draftsError || productionError) {
          return { data: null, error: draftsError || productionError };
        }

        const draftCount =
          existingDrafts?.filter(
            (v) => v.category === formData.category && v.draft_status !== "rejected" && !v.production_video_id
          ).length || 0;

        const productionCount = existingProduction?.filter((v) => v.category === formData.category).length || 0;

        if (draftCount + productionCount >= categoryInfo.maxCount) {
          return {
            data: null,
            error: `${categoryInfo.label}は最大${categoryInfo.maxCount}つまで登録可能です。既に登録されている動画を削除してから変更してください。`
          };
        }
      }
    }

    // submitted、approved、rejectedの場合はdraftに戻す
    const updateData: VideoDraftUpdate = {
      ...formData,
      updated_at: new Date().toISOString()
    } as VideoDraftUpdate;

    if (
      currentDraft?.draft_status === "submitted" ||
      currentDraft?.draft_status === "approved" ||
      currentDraft?.draft_status === "rejected"
    ) {
      (updateData as any).draft_status = "draft";
      (updateData as any).submitted_at = null;
      (updateData as any).approved_at = null;
      (updateData as any).rejected_at = null;
    }

    const { data, error } = await supabase
      .from("videos_draft")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", companyId)
      .select("*, videos!videos_draft_production_video_id_fkey(status)")
      .single();

    if (error) {
      console.error("Update video draft error:", error);
      return { data: null, error: error.message };
    }

    const formattedData = {
      ...data,
      status: (data as any).videos?.status || "closed"
    } as VideoDraftItem;

    revalidatePath("/studio/videos");
    revalidatePath(`/studio/videos/${id}`);
    return { data: formattedData, error: null };
  } catch (error) {
    console.error("Update video draft error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "下書き動画の更新に失敗しました"
    };
  }
}

/**
 * 動画を物理削除（下書きと本番の両方を削除）
 */
export async function deleteVideoPhysically(id: string): Promise<{
  data: boolean;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: false, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: false, error: permissionCheck.error || "編集権限がありません" };
    }

    // 削除操作は権限チェック後に管理者クライアントで行う
    const supabaseAdmin = createAdminClient();

    // 動画情報を取得
    const { data: draft, error: fetchError } = await supabaseAdmin
      .from("videos_draft")
      .select("production_video_id, video_url, thumbnail_url")
      .eq("id", id)
      .eq("company_id", companyId)
      .single();

    if (fetchError || !draft) {
      console.error("Get draft error:", fetchError);
      return { data: false, error: "削除対象の動画が見つかりません" };
    }

    // 本番動画がある場合は削除
    if (draft.production_video_id) {
      const { error: prodDeleteError } = await supabaseAdmin
        .from("videos")
        .delete()
        .eq("id", draft.production_video_id)
        .eq("company_id", companyId);

      if (prodDeleteError) {
        console.error("Delete production video error:", prodDeleteError);
        return { data: false, error: "本番動画の削除に失敗しました" };
      }
    }

    // 下書き動画を削除
    const { error: draftDeleteError } = await supabaseAdmin
      .from("videos_draft")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (draftDeleteError) {
      console.error("Delete video draft error:", draftDeleteError);
      return { data: false, error: "下書き動画の削除に失敗しました" };
    }

    // ストレージからの削除は、他の動画で同じURLが使われている可能性を考慮して
    // ここでは行わない（または別途クリーンアップジョブで行うのが安全）

    revalidatePath("/studio/videos");
    revalidatePath(`/company/${companyId}`);
    return { data: true, error: null };
  } catch (error) {
    console.error("Delete video physically error:", error);
    return {
      data: false,
      error: error instanceof Error ? error.message : "動画の削除に失敗しました"
    };
  }
}

/**
 * 下書き動画を審査申請
 */
export async function submitVideoForReview(draftId: string): Promise<{
  data: VideoDraft | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const userInfo = await getUserInfo();
    const isAdmin = userInfo?.role === "admin" || userInfo?.isAdmin;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    // draftを取得
    const { data: draft, error: draftError } = await supabase
      .from("videos_draft")
      .select("*")
      .eq("id", draftId)
      .eq("company_id", companyId)
      .single();

    if (draftError || !draft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    // 必須項目のバリデーション
    if (!draft.title || draft.title.trim() === "") {
      return { data: null, error: "タイトルは必須項目です" };
    }
    if (!draft.video_url || draft.video_url.trim() === "") {
      return { data: null, error: "動画URLは必須項目です" };
    }

    // 既に承認済みの場合はエラー
    if (draft.draft_status === "approved") {
      return { data: null, error: "既に承認済みです" };
    }

    // 変換中でも申請可能（警告ログのみ）
    if (draft.conversion_status === "processing") {
      console.warn(`Video ${draftId} submitted while conversion is still processing`);
    }

    // ステータスを審査中に更新
    const { data: updatedDraft, error: updateError } = await supabase
      .from("videos_draft")
      .update({
        draft_status: "submitted",
        submitted_at: new Date().toISOString()
      } as VideoDraftUpdate)
      .eq("id", draftId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (updateError) {
      console.error("Submit video for review error:", updateError);
      return { data: null, error: updateError.message };
    }

    revalidatePath("/studio/videos");
    revalidatePath(`/studio/videos/${draftId}`);
    revalidatePath("/admin/review");
    return { data: updatedDraft, error: null };
  } catch (error) {
    console.error("Submit video for review error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "審査申請に失敗しました"
    };
  }
}

/**
 * 本番動画の公開/非公開を切り替え
 */
export async function toggleVideoStatus(
  videoId: string,
  newStatus: "active" | "closed"
): Promise<{
  data: Video | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    const userInfo = await getUserInfo();
    const isAdmin = userInfo?.role === "admin" || userInfo?.isAdmin;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    const { data, error } = await supabase
      .from("videos")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", videoId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) {
      console.error("Toggle video status error:", error);
      return { data: null, error: error.message };
    }

    revalidatePath("/studio/videos");
    revalidatePath(`/company/${companyId}`);
    return { data, error: null };
  } catch (error) {
    console.error("Toggle video status error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ステータスの切り替えに失敗しました"
    };
  }
}

/**
 * 下書き動画の並び順を一括更新
 */
export async function reorderVideosDraft(orders: { id: string; display_order: number }[]): Promise<{
  data: boolean;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: false, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: false, error: permissionCheck.error || "編集権限がありません" };
    }

    const userInfo = await getUserInfo();
    const isAdmin = userInfo?.role === "admin" || userInfo?.isAdmin;
    const supabase = isAdmin ? createAdminClient() : await createClient();

    // 複数行の更新を個別に実行
    const updatePromises = orders.map((order) =>
      supabase
        .from("videos_draft")
        .update({ display_order: order.display_order })
        .eq("id", order.id)
        .eq("company_id", companyId)
    );

    const results = await Promise.all(updatePromises);
    const firstError = results.find((r) => r.error)?.error;

    if (firstError) {
      console.error("Reorder videos draft error:", firstError);
      return { data: false, error: firstError.message };
    }

    revalidatePath("/studio/videos");
    return { data: true, error: null };
  } catch (error) {
    console.error("Reorder videos draft error:", error);
    return {
      data: false,
      error: error instanceof Error ? error.message : "並び順の更新に失敗しました"
    };
  }
}

/**
 * 動画またはサムネイルをアップロード
 */
export async function uploadVideoAsset(
  file: File,
  type: "video" | "thumbnail"
): Promise<{
  data: string | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const supabase = await createClient();

    // ファイルサイズチェック（50MB以下）
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { data: null, error: "ファイルサイズは50MB以下である必要があります" };
    }

    // MIMEタイプチェック
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const allowedTypes = type === "video" ? allowedVideoTypes : allowedImageTypes;

    if (!allowedTypes.includes(file.type)) {
      const typeLabel = type === "video" ? "動画（MP4, WebM）" : "画像（JPEG, PNG, WebP, GIF）";
      return {
        data: null,
        error: `サポートされていないファイル形式です。${typeLabel}をアップロードしてください。`
      };
    }

    // ファイル名を生成
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${companyId}/videos/${type}/${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload video asset error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error("Upload video asset error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}

/**
 * 動画をS3にアップロード（新しいS3アップロード機能）
 * @param file アップロードする動画ファイル
 * @param aspectRatio 横長（landscape）または縦長（portrait）
 * @param videoId 動画ID（既存の動画を更新する場合）
 * @returns S3キーとURLを含む結果
 */
export async function uploadVideoToS3Action(
  file: File,
  aspectRatio: "landscape" | "portrait",
  videoId?: string
): Promise<{
  data: { s3Key: string; url: string; s3Url: string; jobId?: string } | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    // videoIdが指定されていない場合は一時的なIDを生成
    const targetVideoId = videoId || `temp-${Date.now()}`;

    const result = await uploadVideoToS3(file, companyId, targetVideoId, aspectRatio);

    if (result.error || !result.data) {
      return result;
    }

    // S3アップロード成功後、MediaConvertジョブを自動起動
    const jobResult = await createMediaConvertJob({
      videoId: targetVideoId,
      companyId,
      sourceS3Key: result.data.s3Key,
      aspectRatio
    });

    if (jobResult.error) {
      console.error("MediaConvert job creation failed:", jobResult.error);
      // ジョブ作成失敗でもS3アップロードは成功しているので、警告のみ
      // 必要に応じて後で手動でジョブを作成できる
    } else if (jobResult.jobId && videoId) {
      // 既存の動画の場合、ジョブIDとステータスをDBに保存
      const supabase = await createClient();
      await supabase
        .from("videos_draft")
        .update({
          mediaconvert_job_id: jobResult.jobId,
          conversion_status: "processing",
          updated_at: new Date().toISOString()
        })
        .eq("id", videoId)
        .eq("company_id", companyId);
    }

    return {
      ...result,
      data: result.data
        ? {
            ...result.data,
            jobId: jobResult.jobId || undefined
          }
        : null
    };
  } catch (error) {
    console.error("Upload video to S3 action error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "動画のアップロードに失敗しました"
    };
  }
}

/**
 * サムネイルをS3にアップロード
 * @param file アップロードするサムネイル画像ファイル
 * @param videoId 動画ID
 * @returns S3キーとURLを含む結果
 */
export async function uploadThumbnailToS3Action(
  file: File,
  videoId?: string
): Promise<{
  data: { s3Key: string; url: string; s3Url: string } | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    // videoIdが指定されていない場合は一時的なIDを生成
    const targetVideoId = videoId || `temp-${Date.now()}`;

    const result = await uploadThumbnailToS3(file, companyId, targetVideoId);

    return result;
  } catch (error) {
    console.error("Upload thumbnail to S3 action error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "サムネイルのアップロードに失敗しました"
    };
  }
}
