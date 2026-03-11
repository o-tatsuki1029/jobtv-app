"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";
import { logger } from "@/lib/logger";

type CompanyRow = Tables<"companies">;
type CompanyUpdate = TablesUpdate<"companies">;
type CompanyDraftRow = Tables<"companies_draft">;
type CompanyDraftInsert = TablesInsert<"companies_draft">;
type CompanyDraftUpdate = TablesUpdate<"companies_draft">;

/**
 * 企業基本情報保存用のフォームデータ型
 * nameは編集不可のため、含めない
 */
export interface CompanyInfoFormData {
  logo_url?: string;
  /** トップページ企業カード用サムネイル画像URL（未設定時はロゴを表示） */
  thumbnail_url?: string;
  industry?: string;
  representative?: string;
  established?: string;
  employees?: string;
  website?: string;
  prefecture?: string;
  address_line1?: string;
  address_line2?: string;
  company_info?: string;
}

/**
 * 企業基本情報を保存・更新（companies_draftテーブルに保存）
 */
export async function saveCompanyInfo(formData: CompanyInfoFormData): Promise<{
  data: CompanyDraftRow | null;
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

    // すべてのdraftを取得（approved, rejected, submittedを含む）
    const { data: allDrafts, error: draftsError } = await supabase
      .from("companies_draft")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false });

    if (draftsError) {
      return { data: null, error: draftsError.message };
    }

    // 編集可能なdraft（draftステータスのみ）を探す
    const editableDraft = allDrafts?.find((d) => d.draft_status === "draft");

    // 編集モードのdraft（rejected, approved, submitted）を探す
    const editModeDraft = allDrafts?.find(
      (d) => d.draft_status === "rejected" || d.draft_status === "approved" || d.draft_status === "submitted"
    );

    // 更新データを準備
    const draftData: Partial<
      Omit<
        CompanyDraftUpdate,
        | "id"
        | "created_by"
        | "company_id"
        | "draft_status"
        | "submitted_at"
        | "approved_at"
        | "rejected_at"
        | "production_company_id"
      >
    > = {};

    if (formData.logo_url !== undefined) draftData.logo_url = formData.logo_url || null;
    if (formData.thumbnail_url !== undefined) draftData.thumbnail_url = formData.thumbnail_url || null;
    if (formData.industry !== undefined) draftData.industry = formData.industry || null;
    if (formData.representative !== undefined) draftData.representative = formData.representative || null;
    if (formData.established !== undefined) draftData.established = formData.established || null;
    if (formData.employees !== undefined) draftData.employees = formData.employees || null;
    if (formData.website !== undefined) draftData.website = formData.website || null;
    if (formData.prefecture !== undefined) (draftData as any).prefecture = formData.prefecture || null;
    if (formData.address_line1 !== undefined) draftData.address_line1 = formData.address_line1 || null;
    if (formData.address_line2 !== undefined) draftData.address_line2 = formData.address_line2 || null;
    if (formData.company_info !== undefined) draftData.company_info = formData.company_info || null;

    let result: CompanyDraftRow | null = null;

    if (editableDraft) {
      // ケース1: 編集可能なdraft（draftステータス）がある場合は更新
      const updateResult = await updateCompanyInfoDraft(editableDraft.id, draftData);
      if (updateResult.error) {
        return { data: null, error: updateResult.error };
      }
      result = updateResult.data;
    } else if (editModeDraft) {
      // ケース2: 編集モードのdraftがある場合（rejected, approved, submitted）
      // それをdraftに戻して更新（新規作成しない）
      // updateCompanyInfoDraftは内部でdraft_statusなどを処理するため、ここでは渡さない
      const updateResult = await updateCompanyInfoDraft(editModeDraft.id, draftData);
      if (updateResult.error) {
        return { data: null, error: updateResult.error };
      }
      result = updateResult.data;
    } else {
      // ケース3: draftが一切ない場合（新規作成モード）
      const createData: Omit<
        CompanyDraftInsert,
        "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_company_id"
      > = {
        company_id: companyId,
        ...draftData
      } as Omit<
        CompanyDraftInsert,
        "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_company_id"
      >;

      const createResult = await createCompanyInfoDraft(createData);
      if (createResult.error) {
        return { data: null, error: createResult.error };
      }
      result = createResult.data;
    }

    // キャッシュを無効化
    revalidatePath(`/company/${companyId}`);
    revalidatePath("/studio/settings/profile");

    return { data: result, error: null };
  } catch (error) {
    logger.error({ action: "saveCompanyInfo", err: error }, "企業基本情報の保存に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業基本情報の保存に失敗しました"
    };
  }
}

/**
 * 企業情報draftを作成
 */
export async function createCompanyInfoDraft(
  data: Omit<
    CompanyDraftInsert,
    "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_company_id"
  >
) {
  const supabase = await createClient();

  // 現在のユーザーIDを取得
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: "ログインが必要です"
    };
  }

  // 企業名を取得（companiesテーブルから）
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("name")
    .eq("id", data.company_id)
    .single();

  if (companyError || !company) {
    return {
      data: null,
      error: "企業情報が見つかりません"
    };
  }

  const draftData: CompanyDraftInsert = {
    ...data,
    name: company.name,
    created_by: user.id,
    draft_status: "draft"
  } as CompanyDraftInsert;

  const { data: result, error } = await supabase.from("companies_draft").insert(draftData).select().single();

  if (error) {
    logger.error({ action: "createCompanyInfoDraft", err: error }, "企業情報ドラフトの作成に失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/settings/profile");
  return { data: result, error: null };
}

/**
 * 企業情報draftを更新
 */
export async function updateCompanyInfoDraft(
  id: string,
  data: Partial<
    Omit<
      CompanyDraftUpdate,
      | "id"
      | "created_by"
      | "company_id"
      | "draft_status"
      | "submitted_at"
      | "approved_at"
      | "rejected_at"
      | "production_company_id"
    >
  >
) {
  const supabase = await createClient();

  // 現在のdraftを取得して、draft_statusを確認
  const { data: currentDraft, error: fetchError } = await supabase
    .from("companies_draft")
    .select("draft_status")
    .eq("id", id)
    .single();

  if (fetchError) {
    logger.error({ action: "updateCompanyInfoDraft", err: fetchError, draftId: id }, "企業情報ドラフトの取得に失敗しました");
    return { data: null, error: fetchError.message };
  }

  // submitted、approved、rejectedの場合はdraftに戻す（編集可能にする）
  const updateData: CompanyDraftUpdate = {
    ...data,
    updated_at: new Date().toISOString()
  } as CompanyDraftUpdate;

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

  const { data: result, error } = await supabase
    .from("companies_draft")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error({ action: "updateCompanyInfoDraft", err: error, draftId: id }, "企業情報ドラフトの更新に失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/settings/profile");
  return { data: result, error: null };
}

/**
 * 企業情報draftを取得（最新のdraftまたはrejectedを取得）
 */
export async function getCompanyInfoDraft(id?: string) {
  const supabase = await createClient();

  // 現在のユーザーIDを取得
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: "ログインが必要です"
    };
  }

  // ユーザーのcompany_idを取得
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return {
      data: null,
      error: "企業情報が見つかりません"
    };
  }

  if (id) {
    // 指定されたIDのdraftを取得
    const { data: draftById, error: draftByIdError } = await supabase
      .from("companies_draft")
      .select("*")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .single();

    if (draftByIdError || !draftById) {
      // IDで見つからない場合、最新のdraftを取得
      const { data: latestDraft, error: latestDraftError } = await supabase
        .from("companies_draft")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestDraftError) {
        logger.error({ action: "getCompanyInfoDraft", err: latestDraftError }, "企業情報ドラフトの取得に失敗しました");
        return { data: null, error: latestDraftError.message };
      }

      if (!latestDraft) {
        return { data: null, error: "下書きが見つかりません" };
      }

      return { data: latestDraft, error: null };
    }

    return { data: draftById, error: null };
  } else {
    // IDが指定されていない場合、最新のdraftを取得
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("companies_draft")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      logger.error({ action: "getCompanyInfoDraft", err: latestDraftError }, "企業情報ドラフトの取得に失敗しました");
      return { data: null, error: latestDraftError.message };
    }

    if (!latestDraft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    return { data: latestDraft, error: null };
  }
}

/**
 * 企業情報draftを審査申請
 */
export async function submitCompanyInfoForReview(draftId: string) {
  const supabase = await createClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabase
    .from("companies_draft")
    .select("*")
    .eq("id", draftId)
    .single();

  if (draftError || !draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  // submittedの場合は再度申請可能（編集後に再申請する場合）
  if (draft.draft_status === "approved") {
    return { data: null, error: "既に承認済みです。編集してから再度申請してください。" };
  }

  // 審査申請時は本番テーブルを更新しない（承認時に更新される）
  // draftのstatusのみを更新
  const updateData: any = {
    draft_status: "submitted",
    submitted_at: new Date().toISOString()
  };

  const { data: updatedDraft, error: updateError } = await supabase
    .from("companies_draft")
    .update(updateData)
    .eq("id", draftId)
    .select()
    .single();

  if (updateError) {
    logger.error({ action: "submitCompanyInfoForReview", err: updateError, draftId }, "ドラフトステータスの更新に失敗しました");
    return { data: null, error: updateError.message };
  }

  // 更新後の状態を確認
  if (updatedDraft?.draft_status !== "submitted") {
    logger.error({ action: "submitCompanyInfoForReview", draftId, expected: "submitted", actual: updatedDraft?.draft_status }, "ドラフトステータスがsubmittedに更新されませんでした");
    return { data: null, error: "ドラフトステータスの更新に失敗しました" };
  }

  revalidatePath("/studio/settings/profile");
  revalidatePath("/admin/review");
  return { data: updatedDraft, error: null };
}
