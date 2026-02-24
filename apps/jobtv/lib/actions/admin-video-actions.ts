"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Video, VideoDraft, VideoInsert } from "@/types/video.types";

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
      console.error("Get all videos draft error:", error);
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
    console.error("Get all videos draft error:", error);
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
        console.error("Update production video error:", updateError);
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
        console.error("Insert production video error:", insertError);
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
      console.error("Update draft status error:", updateDraftError);
      return { data: null, error: updateDraftError.message };
    }

    console.log("[Approval] OK: draftId=" + draftId);
    revalidatePath("/admin/review");
    revalidatePath("/studio/videos");
    revalidatePath(`/company/${draft.company_id}`);
    return { data: productionVideo, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "動画の承認に失敗しました";
    console.log("[Approval] NG: " + msg);
    console.error("Approve video error:", error);
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
      console.error("Reject video error:", updateError);
      return { data: null, error: updateError.message };
    }

    revalidatePath("/admin/review");
    revalidatePath("/studio/videos");
    return { data: updatedDraft, error: null };
  } catch (error) {
    console.error("Reject video error:", error);
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
      console.error("Get video draft by id (admin) error:", error);
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
    console.error("Get video draft by id (admin) error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "下書き動画の取得に失敗しました"
    };
  }
}

