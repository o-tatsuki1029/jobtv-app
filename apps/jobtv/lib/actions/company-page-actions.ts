"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import type { CompanyProfileFormData } from "@/components/company/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";

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
      console.error("Get company page error:", error);
      return { data: null, error: error.message };
    }

    // データが存在しない場合はnullを返す（新規作成可能）
    return { data: data || null, error: null };
  } catch (error) {
    console.error("Get company page error:", error);
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

    const { data, error } = await supabase.from("company_pages").select("*").eq("company_id", companyId).maybeSingle();

    if (error) {
      console.error("Get company page by id error:", error);
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (error) {
    console.error("Get company page by id error:", error);
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

    // 既存のdraftを取得
    const existingDraftResult = await getCompanyPageDraft();
    if (existingDraftResult.error && !existingDraftResult.error.includes("下書きが見つかりません")) {
      return { data: null, error: existingDraftResult.error };
    }

    const existingDraft = existingDraftResult.data;

    // 更新データを準備
    const draftData: Partial<Omit<
      CompanyPageDraftUpdate,
      | "id"
      | "created_by"
      | "company_id"
      | "draft_status"
      | "submitted_at"
      | "approved_at"
      | "rejected_at"
      | "production_page_id"
    >> = {};

    if (formData.description !== undefined) draftData.description = formData.description || null;
    if (formData.tagline !== undefined) draftData.tagline = formData.tagline || null;
    if (formData.cover_image_url !== undefined) draftData.cover_image_url = formData.cover_image_url || null;
    if (formData.main_video_url !== undefined) draftData.main_video_url = formData.main_video_url || null;
    if (formData.sns_x_url !== undefined) draftData.sns_x_url = formData.sns_x_url || null;
    if (formData.sns_instagram_url !== undefined) draftData.sns_instagram_url = formData.sns_instagram_url || null;
    if (formData.sns_tiktok_url !== undefined) draftData.sns_tiktok_url = formData.sns_tiktok_url || null;
    if (formData.sns_youtube_url !== undefined) draftData.sns_youtube_url = formData.sns_youtube_url || null;
    if (formData.short_videos !== undefined) {
      draftData.short_videos = formData.short_videos ? (formData.short_videos as any) : null;
    }
    if (formData.documentary_videos !== undefined) {
      draftData.documentary_videos = formData.documentary_videos ? (formData.documentary_videos as any) : null;
    }
    if (formData.benefits !== undefined) draftData.benefits = formData.benefits || null;

    let result: CompanyPageDraftRow | null = null;

    if (existingDraft && (existingDraft.draft_status === "draft" || existingDraft.draft_status === "rejected")) {
      // 既存のdraftを更新
      const updateResult = await updateCompanyPageDraft(existingDraft.id, draftData);
      if (updateResult.error) {
        return { data: null, error: updateResult.error };
      }
      result = updateResult.data;
    } else {
      // 新規作成
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
    console.error("Save company page error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業ページ情報の保存に失敗しました"
    };
  }
}

/**
 * 企業ページの動画ライブラリ（company_videos）を保存・更新
 */
export async function saveCompanyPageVideos(formData: { company_videos?: any }): Promise<{
  data: CompanyPageRow | null;
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

    // 既存のページ情報を確認
    const { data: existingPage } = await supabase
      .from("company_pages")
      .select("id")
      .eq("company_id", companyId)
      .maybeSingle();

    // 更新データを準備
    const updateData: CompanyPageUpdate = {};

    if (formData.company_videos !== undefined) {
      updateData.company_videos = formData.company_videos ? (formData.company_videos as any) : null;
    }

    // updated_atは常に更新
    updateData.updated_at = new Date().toISOString();

    let result: CompanyPageRow | null = null;

    if (existingPage) {
      // 既存のページ情報を更新
      const { data, error } = await supabase
        .from("company_pages")
        .update(updateData)
        .eq("id", existingPage.id)
        .select()
        .single();

      if (error) {
        console.error("Update company page videos error:", error);
        return { data: null, error: error.message };
      }

      result = data;
    } else {
      // 新規作成
      const insertData: TablesInsert<"company_pages"> = {
        company_id: companyId,
        ...updateData
      } as TablesInsert<"company_pages">;

      const { data, error } = await supabase.from("company_pages").insert(insertData).select().single();

      if (error) {
        console.error("Create company page videos error:", error);
        return { data: null, error: error.message };
      }

      result = data;
    }

    // キャッシュを無効化
    revalidatePath(`/company/${companyId}`);
    revalidatePath("/studio/company");

    return { data: result, error: null };
  } catch (error) {
    console.error("Save company page videos error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "動画ライブラリの保存に失敗しました"
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
    console.error("Create company page draft error:", error);
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
    console.error("Get company page draft error:", fetchError);
    return { data: null, error: fetchError.message };
  }

  // submittedまたはapprovedの場合はdraftに戻す（編集可能にする）
  const updateData: CompanyPageDraftUpdate = {
    ...data,
    updated_at: new Date().toISOString()
  } as CompanyPageDraftUpdate;

  if (currentDraft?.draft_status === "submitted" || currentDraft?.draft_status === "approved") {
    (updateData as any).draft_status = "draft";
    (updateData as any).submitted_at = null;
    (updateData as any).approved_at = null;
  }

  const { data: result, error } = await supabase
    .from("company_pages_draft")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update company page draft error:", error);
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
        console.error("Get company page draft error:", latestDraftError);
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
        console.error("Get company page draft error:", latestDraftError);
        return { data: null, error: latestDraftError.message };
      }

      if (latestDraft) {
        return { data: latestDraft, error: null };
      }
    }

    return { data: draftById, error: null };
  } else {
    // IDが指定されていない場合、最新のdraftまたはrejectedを取得
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("company_pages_draft")
      .select("*")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      console.error("Get company page draft error:", latestDraftError);
      return { data: null, error: latestDraftError.message };
    }

    if (!latestDraft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    return { data: latestDraft, error: null };
  }
}

/**
 * 企業ページdraftをIDで取得（管理者用、company_idチェックなし）
 */
export async function getCompanyPageDraftById(draftId: string) {
  try {
    const supabase = await createClient();

    console.log("getCompanyPageDraftById called with draftId:", draftId);

    const { data: draft, error } = await supabase
      .from("company_pages_draft")
      .select("*")
      .eq("id", draftId)
      .single();

    console.log("Supabase query result:", { draft, error });

    if (error) {
      console.error("Get company page draft by id error:", error);
      return { data: null, error: error.message };
    }

    if (!draft) {
      console.error("Draft not found for id:", draftId);
      return { data: null, error: "下書きが見つかりません" };
    }

    console.log("Successfully retrieved draft:", draft.id);
    return { data: draft, error: null };
  } catch (error) {
    console.error("Unexpected error in getCompanyPageDraftById:", error);
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
    console.error("Get company page drafts error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 企業ページdraftを審査申請（本番テーブルにコピー）
 */
export async function submitCompanyPageForReview(draftId: string) {
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

  const { error: updateError } = await supabase.from("company_pages_draft").update(updateData).eq("id", draftId);

  if (updateError) {
    console.error("Update draft status error:", updateError);
    return { data: null, error: updateError.message };
  }

  revalidatePath("/studio/company");
  revalidatePath("/admin/review");
  return { data: draft, error: null };
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
      console.error("Upload company page draft cover image error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error("Upload company page draft cover image error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}
