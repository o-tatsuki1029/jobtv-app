"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesUpdate } from "@jobtv-app/shared/types";
import type { CompanyProfileFormData } from "@/components/company/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";

type CompanyRow = Tables<"companies">;
type CompanyUpdate = TablesUpdate<"companies"> & {
  tagline?: string | null;
  sns_x_url?: string | null;
  sns_instagram_url?: string | null;
  sns_tiktok_url?: string | null;
  sns_youtube_url?: string | null;
  capital?: string | null;
  short_videos?: any; // JSONBカラムはany型で受け取る
  documentary_videos?: any; // JSONBカラムはany型で受け取る
  company_videos?: any; // JSONBカラムはany型で受け取る
};

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
 * 企業プロフィールを取得（公開ページ用）
 * 指定された企業IDを使用
 */
export async function getCompanyProfileById(id: string): Promise<{
  data: CompanyRow | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();

    if (error) {
      console.error("Get company profile by id error:", error);
      return { data: null, error: error.message };
    }

    return { data: data as CompanyRow, error: null };
  } catch (error) {
    console.error("Get company profile by id error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業プロフィールの取得に失敗しました"
    };
  }
}

/**
 * 企業プロフィールを保存・更新
 */
export async function saveCompanyProfile(formData: CompanyProfileFormData): Promise<{
  data: CompanyRow | null;
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

    // 更新データを準備（undefinedの項目は更新しない）
    const updateData: CompanyUpdate = {};

    // UIに表示されている項目のみを更新対象とする
    if (formData.description !== undefined) updateData.description = formData.description || null;
    if (formData.tagline !== undefined) updateData.tagline = formData.tagline || null;
    // cover_image_urlは/studio/company/infoページで管理するため、ここでは更新しない
    if (formData.main_video_url !== undefined) updateData.main_video_url = formData.main_video_url || null;
    if (formData.sns_x_url !== undefined) updateData.sns_x_url = formData.sns_x_url || null;
    if (formData.sns_instagram_url !== undefined) updateData.sns_instagram_url = formData.sns_instagram_url || null;
    if (formData.sns_tiktok_url !== undefined) updateData.sns_tiktok_url = formData.sns_tiktok_url || null;
    if (formData.sns_youtube_url !== undefined) updateData.sns_youtube_url = formData.sns_youtube_url || null;
    if (formData.short_videos !== undefined) {
      updateData.short_videos = formData.short_videos ? (formData.short_videos as any) : null;
    }
    if (formData.documentary_videos !== undefined) {
      updateData.documentary_videos = formData.documentary_videos ? (formData.documentary_videos as any) : null;
    }
    if (formData.benefits !== undefined) updateData.benefits = formData.benefits || null;

    // 以下の項目はUIに表示されていないため、undefinedの場合は更新しない
    // ただし、他のページ（例: company/info）から呼び出された場合は更新される
    if (formData.logo_url !== undefined) updateData.logo_url = formData.logo_url || null;
    if (formData.industry !== undefined) updateData.industry = formData.industry || null;
    if (formData.employees !== undefined) updateData.employees = formData.employees || null;
    if (formData.location !== undefined) updateData.location = formData.location || null;
    if (formData.address !== undefined) updateData.address = formData.address || null;
    if (formData.representative !== undefined) updateData.representative = formData.representative || null;
    if (formData.capital !== undefined) updateData.capital = formData.capital || null;
    if (formData.established !== undefined) updateData.established = formData.established || null;
    if (formData.website !== undefined) updateData.website = formData.website || null;

    // updated_atは常に更新
    updateData.updated_at = new Date().toISOString();

    console.log("Saving company profile with data:", {
      companyId,
      updateData: {
        ...updateData,
        short_videos: updateData.short_videos ? "JSONB data" : null,
        documentary_videos: updateData.documentary_videos ? "JSONB data" : null
      }
    });

    const { data, error } = await supabase.from("companies").update(updateData).eq("id", companyId).select().single();

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
    revalidatePath(`/company/${companyId}`);
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

/**
 * 企業の動画ライブラリ（company_videos）を保存・更新
 */
export async function saveCompanyVideos(formData: {
  company_videos?: any;
}): Promise<{
  data: CompanyRow | null;
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

    // 更新データを準備
    const updateData: CompanyUpdate = {};

    if (formData.company_videos !== undefined) {
      updateData.company_videos = formData.company_videos ? (formData.company_videos as any) : null;
    }

    // updated_atは常に更新
    updateData.updated_at = new Date().toISOString();

    console.log("Saving company videos with data:", {
      companyId,
      updateData: {
        ...updateData,
        company_videos: updateData.company_videos ? "JSONB data" : null
      }
    });

    const { data, error } = await supabase.from("companies").update(updateData).eq("id", companyId).select().single();

    if (error) {
      console.error("Save company videos error:", error);
      return { data: null, error: error.message };
    }

    console.log("Successfully saved company videos:", data);

    // キャッシュを無効化
    revalidatePath(`/company/${companyId}`);
    revalidatePath("/studio/company");

    return { data: data as CompanyRow, error: null };
  } catch (error) {
    console.error("Save company videos error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "動画ライブラリの保存に失敗しました"
    };
  }
}
