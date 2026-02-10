"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesUpdate } from "@jobtv-app/shared/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";

type CompanyRow = Tables<"companies">;
type CompanyUpdate = TablesUpdate<"companies">;

/**
 * 企業基本情報保存用のフォームデータ型
 * nameは編集不可のため、含めない
 */
export interface CompanyInfoFormData {
  logo_url?: string;
  cover_image_url?: string;
  representative?: string;
  established?: string;
  employees?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  company_info?: string;
}

/**
 * 企業基本情報を保存・更新
 */
export async function saveCompanyInfo(formData: CompanyInfoFormData): Promise<{
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
    // UIに表示されている項目のみを更新対象とする
    const updateData: CompanyUpdate = {};

    if (formData.logo_url !== undefined) updateData.logo_url = formData.logo_url || null;
    if (formData.cover_image_url !== undefined) updateData.cover_image_url = formData.cover_image_url || null;
    if (formData.representative !== undefined) updateData.representative = formData.representative || null;
    if (formData.established !== undefined) updateData.established = formData.established || null;
    if (formData.employees !== undefined) updateData.employees = formData.employees || null;
    if (formData.website !== undefined) updateData.website = formData.website || null;
    if (formData.address_line1 !== undefined) updateData.address_line1 = formData.address_line1 || null;
    if (formData.address_line2 !== undefined) updateData.address_line2 = formData.address_line2 || null;
    if (formData.company_info !== undefined) updateData.company_info = formData.company_info || null;

    // updated_atは常に更新
    updateData.updated_at = new Date().toISOString();

    console.log("Saving company info with data:", {
      companyId,
      updateData
    });

    const { data, error } = await supabase.from("companies").update(updateData).eq("id", companyId).select().single();

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
    revalidatePath(`/company/${companyId}`);
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
