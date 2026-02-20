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
      return { data: null, error: "下書きが見つかりません" };
    }

    // 審査中でない場合はエラー
    if (draft.draft_status !== "submitted") {
      return { data: null, error: "審査中の動画のみ承認できます" };
    }

    // 変換完了チェック（必須）
    if (draft.conversion_status !== "completed") {
      return {
        data: null,
        error: "動画の変換が完了していません。変換完了後に承認してください。"
      };
    }

    // streaming_urlが設定されているか確認
    if (!draft.streaming_url) {
      return {
        data: null,
        error: "HLS動画のURLが設定されていません。変換処理を確認してください。"
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
          video_url: draft.streaming_url || draft.video_url, // HLS URLを優先
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
        console.error("Update production video error:", updateError);
        return { data: null, error: updateError.message };
      }

      productionVideo = updatedVideo;
    } else {
      // 新規作成
      const videoData: VideoInsert = {
        company_id: draft.company_id,
        title: draft.title,
        video_url: draft.streaming_url || draft.video_url, // HLS URLを優先
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
        console.error("Insert production video error:", insertError);
        return { data: null, error: insertError.message };
      }

      productionVideo = newVideo;
    }

    if (!productionVideo) {
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
      console.error("Update draft status error:", updateDraftError);
      return { data: null, error: updateDraftError.message };
    }

    revalidatePath("/admin/review");
    revalidatePath("/studio/videos");
    revalidatePath(`/company/${draft.company_id}`);
    return { data: productionVideo, error: null };
  } catch (error) {
    console.error("Approve video error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "動画の承認に失敗しました"
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

