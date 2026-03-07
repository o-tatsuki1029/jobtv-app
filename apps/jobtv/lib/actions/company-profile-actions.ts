"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import type { CompanyProfileFormData } from "@/components/company/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";
import { getCompanyPage, getCompanyPageDraft } from "./company-page-actions";
import { getCompanyPageById } from "./company-page-actions";

type CompanyRow = Tables<"companies">;
type CompanyUpdate = TablesUpdate<"companies">;
export type CompanyDraftData = Partial<TablesInsert<"companies_draft">> & { id?: string };

/**
 * 企業プロフィールを取得
 * ログイン中のユーザーの企業IDを使用
 */
export async function getCompanyProfile(): Promise<{
  data: CompanyRow | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();

    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).single();

    if (error) {
      console.error("Get company profile error:", error);
      return { data: null, error: error.message };
    }

    return { data: data as CompanyRow, error: null };
  } catch (error) {
    console.error("Get company profile error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業プロフィールの取得に失敗しました"
    };
  }
}

/**
 * スタジオ一覧用：企業カバー画像のみ取得（軽量）
 * 求人・説明会一覧でカバー画像のフォールバックに使う。getCompanyProfileWithPage よりクエリが少ない。
 */
export async function getCompanyCoverImageForStudio(): Promise<{
  data: { cover_image_url: string | null } | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();
    if (companyIdError) return { data: null, error: companyIdError };

    const supabase = await createClient();
    const { data: draft } = await supabase
      .from("company_pages_draft")
      .select("cover_image_url")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (draft?.cover_image_url) return { data: { cover_image_url: draft.cover_image_url }, error: null };

    const { data: prod } = await supabase
      .from("company_pages")
      .select("cover_image_url")
      .eq("company_id", companyId)
      .maybeSingle();

    return { data: prod ? { cover_image_url: prod.cover_image_url } : { cover_image_url: null }, error: null };
  } catch (error) {
    console.error("Get company cover image error:", error);
    return { data: null, error: "カバー画像の取得に失敗しました" };
  }
}

/**
 * 企業プロフィールと企業ページ情報を同時に取得（ログイン中のユーザーの企業IDを使用）
 * スタジオ管理画面用：ドラフトテーブルを優先的に参照し、本番のステータス情報も付加
 */
export async function getCompanyProfileWithPage(): Promise<{
  data: (CompanyRow & { job_postings?: any[] }) | null;
  error: string | null;
}> {
  try {
    const companyResult = await getCompanyProfile();
    if (companyResult.error) {
      return { data: null, error: companyResult.error };
    }

    const companyId = companyResult.data?.id;
    if (!companyId) {
      return { data: null, error: "企業IDが見つかりません" };
    }

    // ドラフトテーブルから最新の情報を取得（唯一のソース）
    const draftResult = await getCompanyPageDraft();
    if (draftResult.error && !draftResult.error.includes("下書きが見つかりません")) {
      console.error("Get company page draft error:", draftResult.error);
    }

    // 本番テーブルから現在のステータス情報を取得（トグルボタン用）
    const productionResult = await getCompanyPage();
    const productionStatus = productionResult.data?.status || null;
    const productionPageId = productionResult.data?.id || null;

    // 表示に使用するデータはドラフトのみ
    let pageData = draftResult.data || {};

    // 承認済みのドラフト（トグルボタン表示用）
    const supabase = await createClient();
    let approvedDraftStatus: string | null = null;
    let approvedDraftId: string | null = null;

    // 現在のデータが承認済みか、または別に承認済みドラフトがあるか確認
    if (draftResult.data?.draft_status === "approved") {
      approvedDraftStatus = "approved";
      approvedDraftId = draftResult.data.id;
    } else if (productionPageId) {
      // 本番ページIDに紐づく承認済みドラフトを探す
      const { data: approvedDraft } = await supabase
        .from("company_pages_draft")
        .select("id, draft_status")
        .eq("production_page_id", productionPageId)
        .eq("draft_status", "approved")
        .maybeSingle();
      if (approvedDraft) {
        approvedDraftStatus = approvedDraft.draft_status;
        approvedDraftId = approvedDraft.id;
      }
    }

    // 不要なフィールドを除外
    const { id: pageId, status: pageStatus, ...pageDataWithoutId } = pageData as any;

    // ドラフト情報を決定
    const finalDraftStatus = draftResult.data?.draft_status || approvedDraftStatus;
    const finalDraftId = draftResult.data?.id || approvedDraftId;

    // companiesとページデータをマージ
    const mergedData = {
      ...(companyResult.data || {}),
      ...pageDataWithoutId,
      id: companyResult.data?.id, // 会社IDを維持
      status: productionStatus, // 公開設定トグル用に本番ステータスを設定
      draft_id: finalDraftId,
      draft_status: finalDraftStatus,
      production_page_id: draftResult.data?.production_page_id || productionPageId,
      production_status: productionStatus, // 本番ページのステータス（トグル表示用）
      videos: [] // スタジオ用でも初期値として空配列を持たせる
    };

    // スタジオ用でも動画情報を取得してマージ（プレビュー用）
    const { data: studioVideos } = await supabase
      .from("videos")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("display_order", { ascending: true });

    if (studioVideos) {
      (mergedData as any).videos = studioVideos;
    }

    return {
      data: mergedData as CompanyRow & {
        job_postings?: any[];
        draft_id?: string;
        draft_status?: string;
        production_page_id?: string;
        production_status?: "active" | "closed" | null;
        videos?: any[];
      },
      error: null
    };
  } catch (error) {
    console.error("Get company profile with page error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業プロフィールの取得に失敗しました"
    };
  }
}

/**
 * 企業プロフィールを取得（公開ページ用）
 * 指定された企業IDを使用
 * 求人情報と企業ページ情報も一緒に取得
 */
export async function getCompanyProfileById(id: string): Promise<{
  data: (CompanyRow & { job_postings?: any[]; company_page?: any }) | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 企業情報を取得（0件の場合は .single() がエラーになるため .maybeSingle() を使用）
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (companyError) {
      console.error("Get company profile by id error:", companyError);
      return { data: null, error: companyError.message };
    }

    if (!companyData) {
      return { data: null, error: "企業が見つかりません" };
    }

    // 企業ページ情報を取得（getCompanyPageByIdを使用）
    const pageResult = await getCompanyPageById(id);
    if (pageResult.error) {
      console.error("Get company page error:", pageResult.error);
      // ページ情報の取得エラーは無視
    }

    // ログイン中の求職者の卒年度を取得（フィルタリング用）
    const {
      data: { user }
    } = await supabase.auth.getUser();
    let candidateGraduationYear: number | null = null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("candidate_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.candidate_id) {
        const { data: candidate } = await supabase
          .from("candidates")
          .select("graduation_year")
          .eq("id", profile.candidate_id)
          .maybeSingle();
        candidateGraduationYear = candidate?.graduation_year ?? null;
      }
    }

    // 求人情報を取得（status='active'のもののみ、display_order順）
    let jobsQuery = supabase
      .from("job_postings")
      .select("*")
      .eq("company_id", id)
      .eq("status", "active")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (candidateGraduationYear !== null) {
      jobsQuery = jobsQuery.eq("graduation_year", candidateGraduationYear);
    }

    const { data: jobsData, error: jobsError } = await jobsQuery;

    if (jobsError) {
      console.error("Get company jobs error:", jobsError);
      // 求人の取得エラーは無視して企業情報のみ返す
    }

    // 動画情報を取得（status='active'のもののみ）
    const { data: videosData, error: videosError } = await supabase
      .from("videos")
      .select("*")
      .eq("company_id", id)
      .eq("status", "active")
      .order("display_order", { ascending: true });

    if (videosError) {
      console.error("Get company videos error:", videosError);
      // 動画の取得エラーは無視
    }

    // 説明会情報を取得（status='active'のもののみ）
    let sessionsQuery = supabase
      .from("sessions")
      .select(
        `
        *,
        session_dates (
          id,
          event_date,
          start_time,
          end_time,
          capacity
        )
      `
      )
      .eq("company_id", id)
      .eq("status", "active")
      .order("display_order", { ascending: true, nullsFirst: false });

    if (candidateGraduationYear !== null) {
      sessionsQuery = sessionsQuery.or(
        `graduation_year.is.null,graduation_year.eq.${candidateGraduationYear}`
      );
    }

    const { data: sessionsData, error: sessionsError } = await sessionsQuery;

    if (sessionsError) {
      console.error("Get company sessions error:", sessionsError);
      // 説明会の取得エラーは無視
    }

    // 企業データに求人情報とページ情報、動画情報、説明会情報を追加
    // company_pages の id で上書きされないよう、companies の id を明示的に維持する（URL・returnTo は companies.id を使用するため）
    const pageData = pageResult.data || {};
    const { id: _pageId, ...pageDataWithoutId } = pageData as { id?: string; [k: string]: unknown };
    const result = {
      ...companyData,
      ...pageDataWithoutId,
      id: companyData.id,
      job_postings: jobsData || [],
      videos: videosData || [],
      sessions: sessionsData || []
    };

    return {
      data: result as CompanyRow & { job_postings?: any[]; company_page?: any; videos?: any[]; sessions?: any[] },
      error: null
    };
  } catch (error) {
    console.error("Get company profile by id error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業プロフィールの取得に失敗しました"
    };
  }
}

/**
 * 企業アセット（画像・動画）をSupabase Storageにアップロード
 */
export async function uploadCompanyAsset(
  file: File,
  type: "logo" | "thumbnail" | "cover" | "message" | "video"
): Promise<{
  data: string | null; // アップロードされたファイルのURL
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

    // ファイルサイズチェック（50MB以下）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return { data: null, error: "ファイルサイズは50MB以下である必要があります" };
    }

    // MIMEタイプチェック
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"];
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        data: null,
        error:
          "サポートされていないファイル形式です。画像（JPEG, PNG, WebP, GIF）または動画（MP4, WebM）をアップロードしてください。"
      };
    }

    const supabase = await createClient();

    // ファイル名を生成（companyId/type/timestamp-originalname）
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = `${companyId}/${type}/${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload company asset error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error("Upload company asset error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}
