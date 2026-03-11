"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import type { CompanyProfileFormData } from "@/components/company/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";
import { logger } from "@/lib/logger";

type CompanyPageRow = Tables<"company_pages">;
type CompanyPageUpdate = TablesUpdate<"company_pages">;
type CompanyPageDraftRow = Tables<"company_pages_draft">;
type CompanyPageDraftInsert = TablesInsert<"company_pages_draft">;
type CompanyPageDraftUpdate = TablesUpdate<"company_pages_draft">;

/**
 * 企業ページ情報を取得（ログイン中のユーザーの企業IDを使用）
 */
export async function getCompanyPage(): Promise<{
  data: CompanyPageRow | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();

    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from("company_pages").select("*").eq("company_id", companyId).maybeSingle();

    if (error) {
      logger.error({ action: "getCompanyPage", err: error }, "企業ページ情報の取得に失敗しました");
      return { data: null, error: error.message };
    }

    // データが存在しない場合はnullを返す（新規作成可能）
    return { data: data || null, error: null };
  } catch (error) {
    logger.error({ action: "getCompanyPage", err: error }, "企業ページ情報取得で予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業ページ情報の取得に失敗しました"
    };
  }
}

/**
 * 企業ページ情報を取得（公開ページ用）
 * 指定された企業IDを使用
 */
export async function getCompanyPageById(companyId: string): Promise<{
  data: CompanyPageRow | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // status === "active"のレコードのみ取得（公開中のページのみ）
    const { data, error } = await supabase
      .from("company_pages")
      .select("*")
      .eq("company_id", companyId)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      logger.error({ action: "getCompanyPageById", err: error, companyId }, "企業ページ情報の取得に失敗しました");
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (error) {
    logger.error({ action: "getCompanyPageById", err: error, companyId }, "企業ページ情報取得で予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業ページ情報の取得に失敗しました"
    };
  }
}

/**
 * 企業ページ情報を保存・更新
 */
export async function saveCompanyPage(formData: CompanyProfileFormData): Promise<{
  data: CompanyPageDraftRow | null;
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
      .from("company_pages_draft")
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
        CompanyPageDraftUpdate,
        | "id"
        | "created_by"
        | "company_id"
        | "draft_status"
        | "submitted_at"
        | "approved_at"
        | "rejected_at"
        | "production_page_id"
      >
    > = {};

    if (formData.description !== undefined) draftData.description = formData.description || null;
    if (formData.tagline !== undefined) draftData.tagline = formData.tagline || null;
    if (formData.cover_image_url !== undefined) draftData.cover_image_url = formData.cover_image_url || null;
    if (formData.sns_x_url !== undefined) draftData.sns_x_url = formData.sns_x_url || null;
    if (formData.sns_instagram_url !== undefined) draftData.sns_instagram_url = formData.sns_instagram_url || null;
    if (formData.sns_tiktok_url !== undefined) draftData.sns_tiktok_url = formData.sns_tiktok_url || null;
    if (formData.sns_youtube_url !== undefined) draftData.sns_youtube_url = formData.sns_youtube_url || null;
    if (formData.benefits !== undefined) draftData.benefits = formData.benefits || null;

    let result: CompanyPageDraftRow | null = null;

    if (editableDraft) {
      // ケース1: 編集可能なdraft（draftステータス）がある場合は更新
      const updateResult = await updateCompanyPageDraft(editableDraft.id, draftData);
      if (updateResult.error) {
        return { data: null, error: updateResult.error };
      }
      result = updateResult.data;
    } else if (editModeDraft) {
      // ケース2: 編集モードのdraftがある場合（rejected, approved, submitted）
      // それをdraftに戻して更新（新規作成しない）
      // updateCompanyPageDraftは内部でdraft_statusなどを処理するため、ここでは渡さない
      const updateResult = await updateCompanyPageDraft(editModeDraft.id, draftData);
      if (updateResult.error) {
        return { data: null, error: updateResult.error };
      }
      result = updateResult.data;
    } else {
      // ケース3: draftが一切ない場合（新規作成モード）
      const createData: Omit<
        CompanyPageDraftInsert,
        "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_page_id"
      > = {
        company_id: companyId,
        ...draftData
      } as Omit<
        CompanyPageDraftInsert,
        "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_page_id"
      >;

      const createResult = await createCompanyPageDraft(createData);
      if (createResult.error) {
        return { data: null, error: createResult.error };
      }
      result = createResult.data;
    }

    // キャッシュを無効化
    revalidatePath(`/company/${companyId}`);
    revalidatePath("/studio/company");

    return { data: result, error: null };
  } catch (error) {
    logger.error({ action: "saveCompanyPage", err: error }, "企業ページ情報の保存に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業ページ情報の保存に失敗しました"
    };
  }
}

/**
 * 企業ページdraftを作成
 */
export async function createCompanyPageDraft(
  data: Omit<
    CompanyPageDraftInsert,
    "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_page_id"
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

  const draftData: CompanyPageDraftInsert = {
    ...data,
    created_by: user.id,
    draft_status: "draft"
  } as CompanyPageDraftInsert;

  const { data: result, error } = await supabase.from("company_pages_draft").insert(draftData).select().single();

  if (error) {
    logger.error({ action: "createCompanyPageDraft", err: error }, "企業ページドラフトの作成に失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/company");
  return { data: result, error: null };
}

/**
 * 企業ページdraftを更新
 */
export async function updateCompanyPageDraft(
  id: string,
  data: Partial<
    Omit<
      CompanyPageDraftUpdate,
      | "id"
      | "created_by"
      | "company_id"
      | "draft_status"
      | "submitted_at"
      | "approved_at"
      | "rejected_at"
      | "production_page_id"
    >
  >
) {
  const supabase = await createClient();

  // 現在のdraftを取得して、draft_statusを確認
  const { data: currentDraft, error: fetchError } = await supabase
    .from("company_pages_draft")
    .select("draft_status")
    .eq("id", id)
    .single();

  if (fetchError) {
    logger.error({ action: "updateCompanyPageDraft", err: fetchError, draftId: id }, "企業ページドラフトの取得に失敗しました");
    return { data: null, error: fetchError.message };
  }

  // submitted、approved、rejectedの場合はdraftに戻す（編集可能にする）
  const updateData: CompanyPageDraftUpdate = {
    ...data,
    updated_at: new Date().toISOString()
  } as CompanyPageDraftUpdate;

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
    .from("company_pages_draft")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error({ action: "updateCompanyPageDraft", err: error, draftId: id }, "企業ページドラフトの更新に失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/company");
  return { data: result, error: null };
}

/**
 * 企業ページdraftを取得（最新のdraftまたはrejectedを取得）
 */
export async function getCompanyPageDraft(id?: string) {
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
      .from("company_pages_draft")
      .select("*")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .single();

    if (draftByIdError || !draftById) {
      // IDで見つからない場合、最新のdraftまたはrejectedを取得
      const { data: latestDraft, error: latestDraftError } = await supabase
        .from("company_pages_draft")
        .select("*")
        .eq("company_id", profile.company_id)
        .in("draft_status", ["draft", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestDraftError) {
        logger.error({ action: "getCompanyPageDraft", err: latestDraftError }, "IDフォールバックでの企業ページドラフト取得に失敗しました");
        return { data: null, error: latestDraftError.message };
      }

      if (!latestDraft) {
        return { data: null, error: "下書きが見つかりません" };
      }

      return { data: latestDraft, error: null };
    }

    // 取得したdraftがsubmittedまたはapprovedの場合、最新のdraftまたはrejectedを取得
    if (draftById.draft_status === "submitted" || draftById.draft_status === "approved") {
      const { data: latestDraft, error: latestDraftError } = await supabase
        .from("company_pages_draft")
        .select("*")
        .eq("company_id", profile.company_id)
        .in("draft_status", ["draft", "rejected"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestDraftError) {
        logger.error({ action: "getCompanyPageDraft", err: latestDraftError }, "承認済みドラフトの最新版取得に失敗しました");
        return { data: null, error: latestDraftError.message };
      }

      if (latestDraft) {
        return { data: latestDraft, error: null };
      }
    }

    return { data: draftById, error: null };
  } else {
    // IDが指定されていない場合、最新のdraftを取得
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("company_pages_draft")
      .select("*")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "submitted", "approved", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      logger.error({ action: "getCompanyPageDraft", err: latestDraftError }, "最新の企業ページドラフト取得に失敗しました");
      return { data: null, error: latestDraftError.message };
    }

    if (!latestDraft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    return { data: latestDraft, error: null };
  }
}

/**
 * 企業ページdraftをIDで取得（管理者用、company_idチェックなし、RLSバイパス）
 */
export async function getCompanyPageDraftByIdAdmin(draftId: string) {
  try {
    const supabaseAdmin = createAdminClient();

    const { data: draft, error } = await supabaseAdmin
      .from("company_pages_draft")
      .select("*")
      .eq("id", draftId)
      .single();

    if (error) {
      logger.error({ action: "getCompanyPageDraftByIdAdmin", err: error, draftId }, "管理者用企業ページドラフトの取得に失敗しました");
      return { data: null, error: error.message };
    }

    if (!draft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    return { data: draft, error: null };
  } catch (error) {
    logger.error({ action: "getCompanyPageDraftByIdAdmin", err: error, draftId }, "管理者用ドラフト取得で予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました"
    };
  }
}

/**
 * 企業ページdraft一覧を取得（ログインユーザーの企業のdraftのみ）
 */
export async function getCompanyPageDrafts() {
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

  const { data, error } = await supabase
    .from("company_pages_draft")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getCompanyPageDrafts", err: error }, "企業ページドラフト一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 企業ページdraftを審査申請（本番テーブルにコピー）
 */
export async function submitCompanyPageForReview(draftId: string, keepProductionActive: boolean = true) {
  const supabase = await createClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabase
    .from("company_pages_draft")
    .select("*")
    .eq("id", draftId)
    .single();

  if (draftError || !draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  // 必須項目のバリデーション（サーバー側）
  if (!draft.tagline || draft.tagline.trim() === "") {
    return { data: null, error: "キャッチコピーは必須項目です" };
  }
  if (!draft.description || draft.description.trim() === "") {
    return { data: null, error: "会社紹介文は必須項目です" };
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
    .from("company_pages_draft")
    .update(updateData)
    .eq("id", draftId)
    .select()
    .single();

  if (updateError) {
    logger.error({ action: "submitCompanyPageForReview", err: updateError, draftId }, "ドラフトステータスの更新に失敗しました");
    return { data: null, error: updateError.message };
  }

  // 公開設定の処理（keepProductionActiveがfalseの場合は本番ページを非公開にする）
  if (!keepProductionActive && draft.production_page_id) {
    const { error: statusError } = await supabase
      .from("company_pages")
      .update({ status: "closed" })
      .eq("id", draft.production_page_id);

    if (statusError) {
      logger.error({ action: "submitCompanyPageForReview", err: statusError, productionPageId: draft.production_page_id }, "本番ページの非公開化に失敗しました");
      // エラーが発生しても審査申請は完了しているので、警告のみ
    }
  }

  revalidatePath("/studio/company");
  revalidatePath("/admin/review");
  return { data: updatedDraft || draft, error: null };
}

/**
 * 企業ページdraftのカバー画像をアップロード
 */
export async function uploadCompanyPageDraftCoverImage(
  file: File,
  draftId?: string
): Promise<{
  data: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    // ユーザーのcompany_idを取得
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { data: null, error: "企業情報が見つかりません" };
    }

    // ファイルサイズチェック（50MB以下）
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { data: null, error: "ファイルサイズは50MB以下である必要があります" };
    }

    // MIMEタイプチェック
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        data: null,
        error: "サポートされていないファイル形式です。画像（JPEG, PNG, WebP, GIF）をアップロードしてください。"
      };
    }

    // ファイル名を生成
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = draftId
      ? `${profile.company_id}/company-pages/draft/${draftId}/${timestamp}.${fileExt}`
      : `${profile.company_id}/company-pages/draft/temp/${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      logger.error({ action: "uploadCompanyPageDraftCoverImage", err: uploadError, draftId }, "カバー画像のアップロードに失敗しました");
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    logger.error({ action: "uploadCompanyPageDraftCoverImage", err: error, draftId }, "カバー画像アップロードで予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}

/**
 * 企業ページの公開/非公開を切り替え
 */
export async function toggleCompanyPageStatus(companyId: string, newStatus: "active" | "closed") {
  try {
    const supabase = await createClient();

    // 現在のユーザーIDを取得
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    // ユーザーのcompany_idを取得
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return { data: null, error: "企業情報が見つかりません" };
    }

    // 自分の企業のページのみ変更可能
    if (profile.company_id !== companyId) {
      return { data: null, error: "権限がありません" };
    }

    // 企業ページ情報を取得
    const { data: companyPage, error: pageError } = await supabase
      .from("company_pages")
      .select("id, status, company_id")
      .eq("company_id", companyId)
      .maybeSingle();

    if (pageError) {
      logger.error({ action: "toggleCompanyPageStatus", err: pageError, companyId }, "企業ページ情報の取得に失敗しました");
      return { data: null, error: pageError.message };
    }

    if (!companyPage) {
      return { data: null, error: "企業ページが見つかりません" };
    }

    // ステータスを更新
    const { data: updatedPage, error: updateError } = await supabase
      .from("company_pages")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", companyPage.id)
      .select()
      .single();

    if (updateError) {
      logger.error({ action: "toggleCompanyPageStatus", err: updateError, companyId }, "企業ページステータスの切り替えに失敗しました");
      return { data: null, error: updateError.message };
    }

    revalidatePath("/studio/company");
    return { data: updatedPage, error: null };
  } catch (error) {
    logger.error({ action: "toggleCompanyPageStatus", err: error, companyId }, "企業ページステータス切り替えで予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "ステータスの切り替えに失敗しました"
    };
  }
}
