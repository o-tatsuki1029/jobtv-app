"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserInfo } from "@jobtv-app/shared/auth";
import { revalidatePath } from "next/cache";
import type { Tables, TablesUpdate } from "@jobtv-app/shared/types";

type CompanyRow = Tables<"companies">;
type CompanyUpdate = TablesUpdate<"companies">;

/**
 * 企業基本情報保存用のフォームデータ型
 */
/**
 * 企業基本情報保存用のフォームデータ型
 * nameは編集不可のため、含めない
 */
export interface CompanyInfoFormData {
  logo_url?: string;
  representative?: string;
  established?: string;
  capital?: string;
  employees?: string;
  website?: string;
}

/**
 * 編集権限をチェック
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
  if (userInfo.role === "admin") {
    return { allowed: true, error: null };
  }

  // 企業ユーザーは自分の企業のみ編集可能
  if (userInfo.role === "recruiter") {
    if (!userInfo.companyId) {
      return { allowed: false, error: "企業情報が紐付けられていません" };
    }
    if (userInfo.companyId !== companyId) {
      return { allowed: false, error: "この企業の編集権限がありません" };
    }
    return { allowed: true, error: null };
  }

  return { allowed: false, error: "編集権限がありません" };
}

/**
 * 企業基本情報を保存・更新
 */
export async function saveCompanyInfo(
  id: string,
  formData: CompanyInfoFormData
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

    // 更新データを準備（nameは編集不可のため、更新しない）
    const updateData: CompanyUpdate = {
      logo_url: formData.logo_url || null,
      representative: formData.representative || null,
      established: formData.established || null,
      capital: formData.capital || null,
      employees: formData.employees || null,
      website: formData.website || null,
      updated_at: new Date().toISOString()
    };

    console.log("Saving company info with data:", {
      targetCompanyId,
      updateData
    });

    const { data, error } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", targetCompanyId)
      .select()
      .single();

    if (error) {
      console.error("Save company info error:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return { data: null, error: error.message };
    }

    console.log("Successfully saved company info:", data);

    // キャッシュを無効化
    revalidatePath(`/company/${id}`);
    revalidatePath("/studio/company/info");

    return { data: data as CompanyRow, error: null };
  } catch (error) {
    console.error("Save company info error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業基本情報の保存に失敗しました"
    };
  }
}
