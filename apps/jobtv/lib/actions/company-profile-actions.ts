"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserInfo } from "@jobtv-app/shared/auth";
import { revalidatePath } from "next/cache";
import type { Tables, TablesUpdate } from "@jobtv-app/shared/types";

type CompanyRow = Tables<"companies">;
type CompanyUpdate = TablesUpdate<"companies"> & {
  tagline?: string | null;
  sns_x_url?: string | null;
  sns_instagram_url?: string | null;
  sns_tiktok_url?: string | null;
  sns_youtube_url?: string | null;
  short_videos?: any; // JSONBカラムはany型で受け取る
  documentary_videos?: any; // JSONBカラムはany型で受け取る
};

/**
 * 企業プロフィール保存用のフォームデータ型
 */
export interface CompanyProfileFormData {
  description?: string;
  tagline?: string;
  logo_url?: string;
  cover_image_url?: string;
  main_video_url?: string;
  industry?: string;
  employees?: string;
  location?: string;
  address?: string;
  representative?: string;
  capital?: string;
  established?: string;
  website?: string;
  sns_x_url?: string;
  sns_instagram_url?: string;
  sns_tiktok_url?: string;
  sns_youtube_url?: string;
  short_videos?: Array<{
    id: string;
    title: string;
    video_url: string;
    thumbnail_url?: string;
  }>;
  documentary_videos?: Array<{
    id: string;
    title: string;
    video_url: string;
    thumbnail_url?: string;
  }>;
  benefits?: string[];
}

/**
 * 編集権限をチェック
 * 管理者は全企業を編集可能、企業ユーザーは自分の企業のみ編集可能
 */
async function checkCompanyEditPermission(companyId: string): Promise<{
  allowed: boolean;
  error: string | null;
}> {
  const userInfo = await getUserInfo();

  if (!userInfo) {
    return { allowed: false, error: "認証が必要です" };
  }

  // 管理者は全企業を編集可能
  if (userInfo.isAdmin) {
    return { allowed: true, error: null };
  }

  // 企業ユーザー（recruiter）の場合
  if (userInfo.role === "recruiter") {
    // companyIdが未設定の場合は、ユーザーの企業IDを使用
    if (!companyId || companyId === "uid") {
      if (userInfo.companyId) {
        // ユーザーの企業IDを返す（呼び出し元で使用）
        return { allowed: true, error: null };
      }
      return { allowed: false, error: "企業IDが設定されていません" };
    }

    // 自分の企業のみ編集可能
    if (userInfo.companyId === companyId) {
      return { allowed: true, error: null };
    }

    console.error("権限チェック失敗:", {
      userCompanyId: userInfo.companyId,
      requestedCompanyId: companyId,
      role: userInfo.role
    });
    return { allowed: false, error: "この企業の編集権限がありません" };
  }

  return { allowed: false, error: "この企業の編集権限がありません" };
}

/**
 * 最初の企業を取得（管理者用）または自分の企業を取得（企業ユーザー用）
 */
export async function getFirstCompany(): Promise<{
  data: CompanyRow | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const userInfo = await getUserInfo();

    // 企業ユーザーの場合は自分の企業を取得
    if (userInfo && userInfo.role === "recruiter" && userInfo.companyId) {
      const { data, error } = await supabase.from("companies").select("*").eq("id", userInfo.companyId).single();

      if (error) {
        console.error("Get user company error:", error);
        return { data: null, error: error.message };
      }

      return { data: data as CompanyRow, error: null };
    }

    // 管理者の場合は最初の企業を取得
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error("Get first company error:", error);
      return { data: null, error: error.message };
    }

    return { data: data as CompanyRow, error: null };
  } catch (error) {
    console.error("Get first company error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業の取得に失敗しました"
    };
  }
}

/**
 * 企業プロフィールを取得
 */
export async function getCompanyProfile(id: string): Promise<{
  data: CompanyRow | null;
  error: string | null;
}> {
  try {
    const userInfo = await getUserInfo();

    // 企業ユーザーの場合、自分の企業IDを優先
    if (userInfo && userInfo.role === "recruiter" && userInfo.companyId) {
      // "uid"などの無効なUUID、または自分の企業IDと異なる場合は、自分の企業を取得
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id) || id !== userInfo.companyId) {
        const supabase = await createClient();
        const { data, error } = await supabase.from("companies").select("*").eq("id", userInfo.companyId).single();

        if (error) {
          console.error("Get user company profile error:", error);
          return { data: null, error: error.message };
        }

        return { data: data as CompanyRow, error: null };
      }
    }

    // "uid"などの無効なUUIDの場合は、最初の企業を取得（管理者用）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return await getFirstCompany();
    }

    const supabase = await createClient();

    const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();

    if (error) {
      console.error("Get company profile error:", error);
      // エラー時は最初の企業を取得
      return await getFirstCompany();
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
 * 企業プロフィールを保存・更新
 */
export async function saveCompanyProfile(
  id: string,
  formData: CompanyProfileFormData
): Promise<{
  data: CompanyRow | null;
  error: string | null;
}> {
  try {
    // 企業ユーザーの場合、idが"uid"または未設定の場合は自分の企業IDを取得
    const userInfo = await getUserInfo();
    let targetCompanyId = id;

    if ((!id || id === "uid") && userInfo && userInfo.role === "recruiter" && userInfo.companyId) {
      targetCompanyId = userInfo.companyId;
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(targetCompanyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    const supabase = await createClient();

    // 更新データを準備
    const updateData: CompanyUpdate = {
      description: formData.description || null,
      tagline: formData.tagline || null,
      logo_url: formData.logo_url || null,
      cover_image_url: formData.cover_image_url || null,
      main_video_url: formData.main_video_url || null,
      industry: formData.industry || null,
      employees: formData.employees || null,
      location: formData.location || null,
      address: formData.address || null,
      representative: formData.representative || null,
      capital: formData.capital || null,
      established: formData.established || null,
      website: formData.website || null,
      sns_x_url: formData.sns_x_url || null,
      sns_instagram_url: formData.sns_instagram_url || null,
      sns_tiktok_url: formData.sns_tiktok_url || null,
      sns_youtube_url: formData.sns_youtube_url || null,
      // JSONBカラムには直接オブジェクトを渡す（Supabaseが自動的にJSONBに変換）
      short_videos: formData.short_videos ? (formData.short_videos as any) : null,
      documentary_videos: formData.documentary_videos ? (formData.documentary_videos as any) : null,
      benefits: formData.benefits || null,
      updated_at: new Date().toISOString()
    };

    console.log("Saving company profile with data:", {
      targetCompanyId,
      updateData: {
        ...updateData,
        short_videos: updateData.short_videos ? "JSONB data" : null,
        documentary_videos: updateData.documentary_videos ? "JSONB data" : null
      }
    });

    const { data, error } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", targetCompanyId)
      .select()
      .single();

    if (error) {
      console.error("Save company profile error:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return { data: null, error: error.message };
    }

    console.log("Successfully saved company profile:", data);

    // キャッシュを無効化
    revalidatePath(`/company/${id}`);
    revalidatePath("/studio/company");

    return { data: data as CompanyRow, error: null };
  } catch (error) {
    console.error("Save company profile error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業プロフィールの保存に失敗しました"
    };
  }
}

/**
 * 企業アセット（画像・動画）をSupabase Storageにアップロード
 */
export async function uploadCompanyAsset(
  file: File,
  companyId: string,
  type: "logo" | "cover" | "message" | "video"
): Promise<{
  data: string | null; // アップロードされたファイルのURL
  error: string | null;
}> {
  try {
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
