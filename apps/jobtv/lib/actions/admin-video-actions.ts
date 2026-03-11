"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Video, VideoDraft, VideoInsert } from "@/types/video.types";
import { getMediaConvertJobStatus } from "@/lib/aws/mediaconvert-client";
import { getHlsManifestUrl, getMediaConvertThumbnailUrl } from "@/lib/aws/cloudfront-client";
import { logger } from "@/lib/logger";
import { logAudit } from "@jobtv-app/shared/utils/audit";

/**
 * 全企業の審査待ち動画を取得（管理者用）
 */
export async function getAllVideosDraft(filters?: {
  category?: string;
  draft_status?: string;
}): Promise<{
  data: (VideoDraft & { company_name?: string })[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { data: null, error: "管理者権限がありません" };
    }

    const supabaseAdmin = createAdminClient();

    // クエリビルド
    let query = supabaseAdmin
      .from("videos_draft")
      .select(`
        *,
        companies!company_id (
          name
        )
      `)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    // フィルター適用
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }
    if (filters?.draft_status) {
      query = query.eq("draft_status", filters.draft_status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ action: "getAllVideosDraft", err: error }, "審査待ち動画一覧の取得に失敗しました");
      return { data: null, error: error.message };
    }

    // company_nameを追加
    const draftsWithCompany = data?.map((draft: any) => ({
      ...draft,
      company_name: draft.companies?.name || "不明",
      companies: undefined // 余分なフィールドを削除
    }));

    return { data: draftsWithCompany || [], error: null };
  } catch (error) {
    logger.error({ action: "getAllVideosDraft", err: error }, "審査待ち動画一覧の取得に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "審査待ち動画一覧の取得に失敗しました"
    };
  }
}

/**
 * DBのdraftレコードから HLS の streaming_url を組み立てる（SNS Webhook 未設定時のフォールバック）
 * aspect_ratio カラムを使用してURLを構築する
 */
function buildStreamingUrlFromDb(draft: {
  id: string;
  company_id: string;
  aspect_ratio?: string | null;
}): string | null {
  const cloudFrontBase = process.env.AWS_CLOUDFRONT_URL?.replace(/\/$/, "");
  if (!cloudFrontBase) return null;
  const ar = draft.aspect_ratio === "portrait" ? "portrait" : "landscape";
  return `${cloudFrontBase}/companies/${draft.company_id}/videos/${draft.id}/hls/${ar}/original.m3u8`;
}

/**
 * 動画を承認（videos_draft → videos）
 */
export async function approveVideo(draftId: string): Promise<{
  data: Video | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { data: null, error: "管理者権限がありません" };
    }

    // 管理者操作用のクライアント
    const supabaseAdmin = createAdminClient();

    // draftを取得
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("videos_draft")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      console.log("[Approval] NG: draft not found draftId=" + draftId);
      return { data: null, error: "下書きが見つかりません" };
    }

    console.log("[Approval] draft loaded: draftId=" + draftId);

    // 審査中でない場合はエラー
    if (draft.draft_status !== "submitted") {
      console.log("[Approval] NG: draft_status is not submitted");
      return { data: null, error: "審査中の動画のみ承認できます" };
    }

    // 変換完了時のみ承認可能
    if (draft.conversion_status !== "completed") {
      const statusLabel =
        draft.conversion_status === "failed"
          ? "変換に失敗しています。再アップロード後に審査申請してください"
          : "変換が完了していません。変換完了後に承認してください";
      console.log("[Approval] NG: conversion_status=" + (draft.conversion_status || "null"));
      return { data: null, error: `動画の${statusLabel}。` };
    }

    // streaming_url を決定（Webhook で設定されていなければ DBレコードから組み立て）
    let streamingUrl = draft.streaming_url;
    if (!streamingUrl) {
      streamingUrl = buildStreamingUrlFromDb(draft);
      if (streamingUrl) {
        console.log("[Approval] streamingUrl resolved from DB: draftId=" + draftId);
      }
    }
    if (!streamingUrl) {
      console.log("[Approval] NG: could not resolve streamingUrl");
      return {
        data: null,
        error: "HLS動画のURLを特定できません。動画URLの形式を確認するか、変換完了後に再度お試しください。"
      };
    }

    // メインビデオの場合、既存のメインビデオを非公開にする
    if (draft.category === "main") {
      await supabaseAdmin
        .from("videos")
        .update({ status: "closed" })
        .eq("company_id", draft.company_id)
        .eq("category", "main");
    }

    // 本番テーブルにコピーまたは更新
    let productionVideo: Video | null = null;

    if (draft.production_video_id) {
      // 既存の本番動画を更新
      const { data: updatedVideo, error: updateError } = await supabaseAdmin
        .from("videos")
        .update({
          title: draft.title,
          video_url: streamingUrl,
          source_url: draft.video_url,
          streaming_url: streamingUrl,
          auto_thumbnail_url: draft.auto_thumbnail_url,
          thumbnail_url: draft.thumbnail_url,
          category: draft.category,
          display_order: draft.display_order,
          status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", draft.production_video_id)
        .select()
        .single();

      if (updateError) {
        console.log("[Approval] NG: update production video error=" + updateError.message);
        logger.error({ action: "approveVideo", err: updateError, draftId }, "本番動画の更新に失敗しました");
        return { data: null, error: updateError.message };
      }

      productionVideo = updatedVideo;
    } else {
      // 新規作成
      const videoData: VideoInsert = {
        company_id: draft.company_id,
        title: draft.title,
        video_url: streamingUrl,
        source_url: draft.video_url,
        streaming_url: streamingUrl,
        auto_thumbnail_url: draft.auto_thumbnail_url,
        thumbnail_url: draft.thumbnail_url,
        category: draft.category,
        display_order: draft.display_order,
        status: "active"
      };

      const { data: newVideo, error: insertError } = await supabaseAdmin
        .from("videos")
        .insert(videoData)
        .select()
        .single();

      if (insertError) {
        console.log("[Approval] NG: insert production video error=" + insertError.message);
        logger.error({ action: "approveVideo", err: insertError, draftId }, "本番動画の作成に失敗しました");
        return { data: null, error: insertError.message };
      }

      productionVideo = newVideo;
    }

    if (!productionVideo) {
      console.log("[Approval] NG: productionVideo is null");
      return { data: null, error: "本番動画の作成・更新に失敗しました" };
    }

    // draftのステータスを承認済みに更新
    const { error: updateDraftError } = await supabaseAdmin
      .from("videos_draft")
      .update({
        draft_status: "approved",
        approved_at: new Date().toISOString(),
        production_video_id: productionVideo.id
      })
      .eq("id", draftId);

    if (updateDraftError) {
      console.log("[Approval] NG: update draft status error=" + updateDraftError.message);
      logger.error({ action: "approveVideo", err: updateDraftError, draftId }, "ドラフトステータスの更新に失敗しました");
      return { data: null, error: updateDraftError.message };
    }

    console.log("[Approval] OK: draftId=" + draftId);

    logAudit({
      userId: user.id,
      action: "video.approve",
      category: "content_review",
      resourceType: "videos_draft",
      resourceId: draftId,
      app: "jobtv",
      metadata: { companyId: draft.company_id, videoTitle: draft.title },
    });

    revalidatePath("/admin/review");
    revalidatePath("/studio/videos");
    revalidatePath(`/company/${draft.company_id}`);
    return { data: productionVideo, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "動画の承認に失敗しました";
    console.log("[Approval] NG: " + msg);
    logger.error({ action: "approveVideo", err: error, draftId }, "動画の承認に失敗しました");
    return {
      data: null,
      error: msg
    };
  }
}

/**
 * 動画を却下
 */
export async function rejectVideo(
  draftId: string,
  reason?: string
): Promise<{
  data: VideoDraft | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { data: null, error: "管理者権限がありません" };
    }

    const supabaseAdmin = createAdminClient();

    // draftを取得
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("videos_draft")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    // 審査中でない場合はエラー
    if (draft.draft_status !== "submitted") {
      return { data: null, error: "審査中の動画のみ却下できます" };
    }

    // draftのステータスを却下に更新
    const { data: updatedDraft, error: updateError } = await supabaseAdmin
      .from("videos_draft")
      .update({
        draft_status: "rejected",
        rejected_at: new Date().toISOString()
      })
      .eq("id", draftId)
      .select()
      .single();

    if (updateError) {
      logger.error({ action: "rejectVideo", err: updateError, draftId }, "動画の却下に失敗しました");
      return { data: null, error: updateError.message };
    }

    logAudit({
      userId: user.id,
      action: "video.reject",
      category: "content_review",
      resourceType: "videos_draft",
      resourceId: draftId,
      app: "jobtv",
      metadata: { companyId: draft.company_id, reason },
    });

    revalidatePath("/admin/review");
    revalidatePath("/studio/videos");
    return { data: updatedDraft, error: null };
  } catch (error) {
    logger.error({ action: "rejectVideo", err: error, draftId }, "動画の却下に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "動画の却下に失敗しました"
    };
  }
}

/**
 * 特定の下書き動画を取得（管理者用・company_idチェックなし）
 */
export async function getVideoDraftByIdAdmin(draftId: string): Promise<{
  data: (VideoDraft & { company_name?: string }) | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 管理者権限チェック
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { data: null, error: "管理者権限がありません" };
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("videos_draft")
      .select(`
        *,
        companies!videos_draft_company_id_fkey (
          name
        )
      `)
      .eq("id", draftId)
      .single();

    if (error) {
      logger.error({ action: "getVideoDraftByIdAdmin", err: error, draftId }, "下書き動画の取得に失敗しました");
      return { data: null, error: error.message };
    }

    // company_nameを追加
    const draftWithCompany: any = {
      ...data,
      company_name: (data as any).companies?.name || "不明",
      companies: undefined
    };

    return { data: draftWithCompany, error: null };
  } catch (error) {
    logger.error({ action: "getVideoDraftByIdAdmin", err: error, draftId }, "下書き動画の取得に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "下書き動画の取得に失敗しました"
    };
  }
}

/**
 * 変換ステータスを一括チェック・更新（管理者用、getUserCompanyId に依存しない）
 */
export async function checkConversionStatusBatchAdmin(
  draftIds: string[]
): Promise<{ updatedIds: string[]; error: string | null }> {
  if (draftIds.length === 0) return { updatedIds: [], error: null };

  const supabaseAdmin = createAdminClient();

  // 対象ドラフトを一括取得
  const { data: drafts, error: fetchError } = await supabaseAdmin
    .from("videos_draft")
    .select("id, company_id, mediaconvert_job_id, conversion_status, aspect_ratio, streaming_url")
    .in("id", draftIds)
    .in("conversion_status", ["processing", "pending"]);

  if (fetchError) {
    return { updatedIds: [], error: fetchError.message };
  }

  if (!drafts || drafts.length === 0) return { updatedIds: [], error: null };

  const updatedIds: string[] = [];

  await Promise.all(
    drafts.map(async (draft) => {
      if (!draft.mediaconvert_job_id) return;

      const jobStatus = await getMediaConvertJobStatus(draft.mediaconvert_job_id);
      if (jobStatus.error) return;

      const status = jobStatus.status || "";

      if (status === "COMPLETE") {
        const updatePayload: Record<string, any> = {
          conversion_status: "completed",
          updated_at: new Date().toISOString()
        };

        if (draft.streaming_url == null && draft.aspect_ratio) {
          try {
            const ar = draft.aspect_ratio === "portrait" ? "portrait" : "landscape";
            updatePayload.streaming_url = await getHlsManifestUrl(draft.company_id, draft.id, ar);
            updatePayload.auto_thumbnail_url = await getMediaConvertThumbnailUrl(draft.company_id, draft.id, ar);
          } catch {
            // CloudFront未設定時はスキップ
          }
        }

        await supabaseAdmin.from("videos_draft").update(updatePayload).eq("id", draft.id);
        updatedIds.push(draft.id);
      } else if (status === "ERROR" || status === "CANCELED") {
        await supabaseAdmin
          .from("videos_draft")
          .update({ conversion_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", draft.id);
        updatedIds.push(draft.id);
      }
    })
  );

  return { updatedIds, error: null };
}

