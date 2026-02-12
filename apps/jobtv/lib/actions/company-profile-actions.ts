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
 * 企業プロフィールと企業ページ情報を同時に取得（ログイン中のユーザーの企業IDを使用）
 * デフォルトでは本番テーブル（company_pages）の内容を表示し、編集可能なドラフトがある場合はドラフトの内容を優先
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

    // まず本番テーブル（company_pages）からデータを取得（デフォルト）
    const productionResult = await getCompanyPage();
    if (productionResult.error) {
      // 本番テーブルにデータがない場合はエラーを無視（新規作成可能なため）
      console.error("Get company page error:", productionResult.error);
    }

    // 次にドラフトテーブルから編集可能なドラフト（draftまたはrejected）を取得
    const draftResult = await getCompanyPageDraft();
    if (draftResult.error) {
      // ドラフト情報の取得エラーは無視（新規作成可能なため）
      console.error("Get company page draft error:", draftResult.error);
    }

    // デフォルトは本番テーブルの内容を使用
    let pageData = productionResult.data || {};

    // 編集可能なドラフト（draftまたはrejected）がある場合は、ドラフトの内容を優先
    if (draftResult.data && (draftResult.data.draft_status === "draft" || draftResult.data.draft_status === "rejected")) {
      pageData = draftResult.data;
    }

    // companiesとページデータをマージ
    const mergedData = {
      ...(companyResult.data || {}),
      ...pageData,
      // ドラフト情報を追加
      draft_id: draftResult.data?.id,
      draft_status: draftResult.data?.draft_status,
      production_page_id: draftResult.data?.production_page_id || productionResult.data?.id
    };

    return { data: mergedData as CompanyRow & { job_postings?: any[]; draft_id?: string; draft_status?: string; production_page_id?: string }, error: null };
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

    // 企業情報を取得
    const { data: companyData, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (companyError) {
      console.error("Get company profile by id error:", companyError);
      return { data: null, error: companyError.message };
    }

    // 企業ページ情報を取得（getCompanyPageByIdを使用）
    const pageResult = await getCompanyPageById(id);
    if (pageResult.error) {
      console.error("Get company page error:", pageResult.error);
      // ページ情報の取得エラーは無視
    }

    // 求人情報を取得（status='active'のもののみ）
    const { data: jobsData, error: jobsError } = await supabase
      .from("job_postings")
      .select("*")
      .eq("company_id", id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (jobsError) {
      console.error("Get company jobs error:", jobsError);
      // 求人の取得エラーは無視して企業情報のみ返す
    }

    // 企業データに求人情報とページ情報を追加
    const result = {
      ...companyData,
      ...(pageResult.data || {}),
      job_postings: jobsData || []
    };

    return { data: result as CompanyRow & { job_postings?: any[]; company_page?: any }, error: null };
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
  type: "logo" | "cover" | "message" | "video"
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
