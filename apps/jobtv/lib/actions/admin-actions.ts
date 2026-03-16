"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import { logger } from "@/lib/logger";
import { logAudit } from "@jobtv-app/shared/utils/audit";

/**
 * 管理者権限をチェック
 */
export async function checkAdminPermission(): Promise<{
  isAdmin: boolean;
  userId: string | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, userId: null, error: "ログインが必要です" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { isAdmin: false, userId: null, error: "ユーザー情報が見つかりません" };
  }

  const isAdmin = profile.role === "admin";

  return { isAdmin, userId: user.id, error: null };
}

/**
 * 審査待ちの求人一覧を取得（全企業）
 */
export async function getAllJobsForReview(params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
}) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, count: 0, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const limit = params?.limit;
  const offset = params?.offset ?? 0;
  const sortBy = params?.sortBy ?? "created_at_desc";

  // 求人の審査はjob_postings_draftテーブルから取得
  let draftsQuery = supabaseAdmin
    .from("job_postings_draft")
    .select(
      `
      *,
      companies!company_id(id, name),
      production:job_postings!production_job_id(*)
    `,
      { count: "exact" }
    )
    .eq("draft_status", "submitted");

  switch (sortBy) {
    case "title_asc":
      draftsQuery = draftsQuery.order("title", { ascending: true });
      break;
    case "title_desc":
      draftsQuery = draftsQuery.order("title", { ascending: false });
      break;
    case "created_at_asc":
      draftsQuery = draftsQuery.order("submitted_at", { ascending: true });
      break;
    default:
      draftsQuery = draftsQuery.order("submitted_at", { ascending: false });
  }

  if (limit !== undefined) {
    draftsQuery = draftsQuery.range(offset, offset + limit - 1);
  }

  const { data: drafts, count: totalCount, error: draftsError } = await draftsQuery;

  if (draftsError) {
    logger.error({ action: "getAllJobsForReview", err: draftsError }, "求人ドラフト一覧の取得に失敗しました");
    return { data: null, count: null, error: draftsError.message };
  }

  // 企業IDのリストを取得
  const companyIds = [...new Set((drafts || []).map((draft: any) => draft.company_id).filter(Boolean))];

  // 企業ページ情報を一括取得（ドラフトと本番の両方を取得）
  const companyPagesMap = new Map<string, { cover_image_url?: string | null }>();
  if (companyIds.length > 0) {
    // 本番の企業ページ情報を取得
    const { data: companyPages } = await supabaseAdmin
      .from("company_pages")
      .select("company_id, cover_image_url")
      .in("company_id", companyIds)
      .eq("status", "active");

    if (companyPages) {
      companyPages.forEach((page: any) => {
        companyPagesMap.set(page.company_id, { cover_image_url: page.cover_image_url });
      });
    }

    // ドラフトの企業ページ情報も取得（本番がない場合のフォールバック）
    const { data: companyPageDrafts } = await supabaseAdmin
      .from("company_pages_draft")
      .select("company_id, cover_image_url")
      .in("company_id", companyIds);

    if (companyPageDrafts) {
      companyPageDrafts.forEach((draft: any) => {
        if (!companyPagesMap.has(draft.company_id)) {
          companyPagesMap.set(draft.company_id, { cover_image_url: draft.cover_image_url });
        }
      });
    }
  }

  // ドラフトデータと企業データをマージ
  const mergedData = (drafts || []).map((draft: any) => {
    const companyPage = companyPagesMap.get(draft.company_id);
    const merged = {
      ...draft.companies,
      ...draft,
      // 求人のデータを優先
      title: draft.title,
      description: draft.description,
      employment_type: draft.employment_type,
      prefecture: draft.prefecture,
      location_detail: draft.location_detail,
      graduation_year: draft.graduation_year,
      requirements: draft.requirements,
      benefits: draft.benefits,
      selection_process: draft.selection_process,
      cover_image_url: draft.cover_image_url,
      available_statuses: draft.available_statuses,
      // 企業のカバー画像を追加
      company_cover_image_url: companyPage?.cover_image_url || null,
      production_job_id: draft.production_job_id,
      // 差分表示用に本番データを追加
      production_data: draft.production,
      // 承認・却下は常にドラフトIDで行う
      id: draft.id
    };
    return merged;
  });
  return { data: mergedData || [], count: totalCount ?? mergedData?.length ?? 0, error: null };
}

/**
 * 審査待ちの説明会一覧を取得（全企業）
 */
export async function getAllSessionsForReview(params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
}) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, count: 0, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const limit = params?.limit;
  const offset = params?.offset ?? 0;
  const sortBy = params?.sortBy ?? "created_at_desc";

  // 説明会の審査はsessions_draftテーブルから取得
  let draftsQuery = supabaseAdmin
    .from("sessions_draft")
    .select(
      `
      *,
      companies!company_id(id, name),
      production:sessions!production_session_id(*)
    `,
      { count: "exact" }
    )
    .eq("draft_status", "submitted");

  switch (sortBy) {
    case "title_asc":
      draftsQuery = draftsQuery.order("title", { ascending: true });
      break;
    case "title_desc":
      draftsQuery = draftsQuery.order("title", { ascending: false });
      break;
    case "created_at_asc":
      draftsQuery = draftsQuery.order("submitted_at", { ascending: true });
      break;
    default:
      draftsQuery = draftsQuery.order("submitted_at", { ascending: false });
  }

  if (limit !== undefined) {
    draftsQuery = draftsQuery.range(offset, offset + limit - 1);
  }

  const { data: drafts, count: totalCount, error: draftsError } = await draftsQuery;

  if (draftsError) {
    logger.error({ action: "getAllSessionsForReview", err: draftsError }, "説明会ドラフト一覧の取得に失敗しました");
    return { data: null, count: null, error: draftsError.message };
  }

  // 企業IDのリストを取得
  const companyIds = [...new Set((drafts || []).map((draft: any) => draft.company_id).filter(Boolean))];

  // 企業ページ情報を一括取得（ドラフトと本番の両方を取得）
  const companyPagesMap = new Map<string, { cover_image_url?: string | null }>();
  if (companyIds.length > 0) {
    // 本番の企業ページ情報を取得
    const { data: companyPages } = await supabaseAdmin
      .from("company_pages")
      .select("company_id, cover_image_url")
      .in("company_id", companyIds)
      .eq("status", "active");

    if (companyPages) {
      companyPages.forEach((page: any) => {
        companyPagesMap.set(page.company_id, { cover_image_url: page.cover_image_url });
      });
    }

    // ドラフトの企業ページ情報も取得（本番がない場合のフォールバック）
    const { data: companyPageDrafts } = await supabaseAdmin
      .from("company_pages_draft")
      .select("company_id, cover_image_url")
      .in("company_id", companyIds);

    if (companyPageDrafts) {
      companyPageDrafts.forEach((draft: any) => {
        if (!companyPagesMap.has(draft.company_id)) {
          companyPagesMap.set(draft.company_id, { cover_image_url: draft.cover_image_url });
        }
      });
    }
  }

  // ドラフトデータと企業データをマージ
  const mergedData = (drafts || []).map((draft: any) => {
    const companyPage = companyPagesMap.get(draft.company_id);
    const merged = {
      ...draft.companies,
      ...draft,
      // 説明会のデータを優先
      title: draft.title,
      type: draft.type,
      location_type: draft.location_type,
      location_detail: draft.location_detail,
      capacity: draft.capacity,
      description: draft.description,
      cover_image_url: draft.cover_image_url,
      // 企業のカバー画像を追加
      company_cover_image_url: companyPage?.cover_image_url || null,
      production_session_id: draft.production_session_id,
      // 差分表示用に本番データを追加
      production_data: draft.production,
      // 承認・却下は常にドラフトIDで行う
      id: draft.id
    };
    return merged;
  });
  return { data: mergedData || [], count: totalCount ?? mergedData?.length ?? 0, error: null };
}

/**
 * 審査待ちの企業情報（companies）一覧を取得
 */
export async function getAllCompanyInfoForReview() {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  // 企業情報の審査はcompanies_draftテーブルから取得
  // company_idのリレーションシップを明示的に指定
  const { data: drafts, error: draftsError } = await supabaseAdmin
    .from("companies_draft")
    .select(
      `
      *,
      companies!company_id(id, name, logo_url, website, industry, employees, prefecture, address_line1, address_line2, representative, established, company_info),
      production:companies!production_company_id(id, name, logo_url, website, industry, employees, prefecture, address_line1, address_line2, representative, established, company_info)
    `
    )
    .eq("draft_status", "submitted")
    .order("submitted_at", { ascending: false });

  if (draftsError) {
    logger.error({ action: "getAllCompanyInfoForReview", err: draftsError }, "企業情報ドラフト一覧の取得に失敗しました");
    return { data: null, error: draftsError.message };
  }

  // ドラフトデータと企業データをマージ
  const mergedData = (drafts || []).map((draft: any) => {
    const merged = {
      ...draft.companies,
      ...draft,
      // 企業情報のデータを優先
      // 審査用のID（draft size）
      draft_id: draft.id,
      production_company_id: draft.production_company_id,
      // 差分表示用に本番データを追加
      production_data: draft.production,
      // 本番テーブルのIDとしてproduction_company_idを使用（なければdraft.id）
      id: draft.production_company_id || draft.id
    };
    return merged;
  });

  return { data: mergedData || [], error: null };
}

/**
 * 審査待ちの企業ページ一覧を取得
 */
export async function getAllCompaniesForReview(params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
}) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, count: 0, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const limit = params?.limit;
  const offset = params?.offset ?? 0;
  const sortBy = params?.sortBy ?? "created_at_desc";

  // 企業ページの審査はcompany_pages_draftテーブルから取得
  let draftsQuery = supabaseAdmin
    .from("company_pages_draft")
    .select(
      `
      *,
      companies!company_id(id, name, logo_url, website, industry, employees, prefecture, address_line1, address_line2, representative, established, company_info),
      production:company_pages!production_page_id(*)
    `,
      { count: "exact" }
    )
    .eq("draft_status", "submitted");

  switch (sortBy) {
    case "name_asc":
      draftsQuery = draftsQuery.order("submitted_at", { ascending: true });
      break;
    case "name_desc":
      draftsQuery = draftsQuery.order("submitted_at", { ascending: false });
      break;
    case "created_at_asc":
      draftsQuery = draftsQuery.order("submitted_at", { ascending: true });
      break;
    default:
      draftsQuery = draftsQuery.order("submitted_at", { ascending: false });
  }

  if (limit !== undefined) {
    draftsQuery = draftsQuery.range(offset, offset + limit - 1);
  }

  const { data: drafts, count: totalCount, error: draftsError } = await draftsQuery;

  if (draftsError) {
    logger.error({ action: "getAllCompaniesForReview", err: draftsError }, "企業ページドラフト一覧の取得に失敗しました");
    return { data: null, count: null, error: draftsError.message };
  }

  // ドラフトデータと企業データをマージ
  const mergedData = (drafts || []).map((draft: any) => {
    const merged = {
      ...draft.companies,
      ...draft,
      // 企業ページのデータを優先
      tagline: draft.tagline,
      description: draft.description,
      cover_image_url: draft.cover_image_url,
      main_video_url: draft.main_video_url,
      sns_x_url: draft.sns_x_url,
      sns_instagram_url: draft.sns_instagram_url,
      sns_tiktok_url: draft.sns_tiktok_url,
      sns_youtube_url: draft.sns_youtube_url,
      short_videos: draft.short_videos,
      documentary_videos: draft.documentary_videos,
      benefits: draft.benefits,
      // 審査用のID（draftのID） - 重要: このIDを使ってプレビューを開く
      draft_id: draft.id,
      production_page_id: draft.production_page_id,
      // 差分表示用に本番データを追加
      production_data: draft.production
    };
    return merged;
  });

  return { data: mergedData || [], count: totalCount ?? mergedData?.length ?? 0, error: null };
}

/**
 * 求人draftのステータスを更新（審査承認・却下）
 */
export async function updateJobDraftStatus(draftId: string, status: "approved" | "rejected") {
  const { isAdmin } = await checkAdminPermission();

  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabaseAdmin
    .from("job_postings_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    logger.error({ action: "updateJobDraftStatus", draftId, err: draftError }, "求人ドラフトの取得に失敗しました");
    return { data: null, error: draftError.message };
  }

  if (!draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  if (draft.draft_status !== "submitted") {
    return { data: null, error: "審査申請済みの下書きのみ承認・却下できます" };
  }

  // 本番テーブルを更新または作成
  let productionJob;
  if (draft.production_job_id) {
    // 既存の本番テーブルを更新

    const productionData: TablesUpdate<"job_postings"> = {
      title: draft.title,
      description: draft.description,
      employment_type: draft.employment_type,
      prefecture: draft.prefecture,
      location_detail: draft.location_detail,
      graduation_year: draft.graduation_year,
      display_order: draft.display_order,
      requirements: draft.requirements,
      benefits: draft.benefits,
      selection_process: draft.selection_process,
      cover_image_url: draft.cover_image_url,
      available_statuses: draft.available_statuses,
      status: status === "approved" ? "active" : "closed",
      updated_at: new Date().toISOString()
    } as TablesUpdate<"job_postings">;

    const { data: updatedJob, error: updateError } = await supabaseAdmin
      .from("job_postings")
      .update(productionData)
      .eq("id", draft.production_job_id)
      .select()
      .maybeSingle();

    if (updateError) {
      logger.error({ action: "updateJobDraftStatus", draftId, err: updateError }, "求人本番テーブルの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    if (!updatedJob) {
      // 本番テーブルに該当レコードが存在しない可能性がある
      logger.error({ action: "updateJobDraftStatus", draftId, production_job_id: draft.production_job_id }, "本番求人レコードが見つかりません。新規作成にフォールバックします");
      // 新規作成にフォールバック
    } else {
      productionJob = updatedJob;
    }
  }

  // production_job_idがない場合、または更新に失敗した場合は新規作成
  if (!productionJob) {
    const productionData: TablesInsert<"job_postings"> = {
      company_id: draft.company_id,
      title: draft.title,
      description: draft.description,
      employment_type: draft.employment_type,
      prefecture: draft.prefecture,
      location_detail: draft.location_detail,
      graduation_year: draft.graduation_year,
      display_order: draft.display_order,
      requirements: draft.requirements,
      benefits: draft.benefits,
      selection_process: draft.selection_process,
      cover_image_url: draft.cover_image_url,
      available_statuses: draft.available_statuses,
      created_by: draft.created_by,
      status: status === "approved" ? "active" : "closed"
    } as TablesInsert<"job_postings">;

    const { data: insertedJob, error: insertError } = await supabaseAdmin
      .from("job_postings")
      .insert(productionData)
      .select()
      .maybeSingle();

    if (insertError) {
      logger.error({ action: "updateJobDraftStatus", draftId, err: insertError }, "求人本番テーブルの作成に失敗しました");
      return { data: null, error: insertError.message };
    }

    if (!insertedJob) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionJob = insertedJob;
  }

  // draftのstatusを更新
  // UNIQUE制約に対応: production_job_idが既に他のドラフトで使用されている場合、そのドラフトを更新
  if (status === "approved" && productionJob.id) {
    // 同じproduction_job_idを持つ既存のドラフトを確認
    const { data: existingDraft } = await supabaseAdmin
      .from("job_postings_draft")
      .select("id")
      .eq("production_job_id", productionJob.id)
      .neq("id", draftId)
      .maybeSingle();

    if (existingDraft) {
      // 既存のドラフトを削除（UNIQUE制約を満たすため）
      await supabaseAdmin.from("job_postings_draft").delete().eq("id", existingDraft.id);
    }
  }

  const updateData: TablesUpdate<"job_postings_draft"> = {
    draft_status: status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    rejected_at: status === "rejected" ? new Date().toISOString() : null
  } as TablesUpdate<"job_postings_draft">;

  if (!draft.production_job_id && productionJob) {
    (updateData as any).production_job_id = productionJob.id;
  }

  const { error: updateDraftError } = await supabaseAdmin.from("job_postings_draft").update(updateData).eq("id", draftId);

  if (updateDraftError) {
    logger.error({ action: "updateJobDraftStatus", draftId, err: updateDraftError }, "求人ドラフトステータスの更新に失敗しました");
    return { data: null, error: updateDraftError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/jobs");
  revalidatePath("/studio/jobs");

  if (user) {
    logAudit({
      userId: user.id,
      action: status === "approved" ? "job.approve" : "job.reject",
      category: "content_review",
      resourceType: "job_postings_draft",
      resourceId: draftId,
      app: "jobtv",
      metadata: { companyId: draft.company_id, jobTitle: draft.title },
    });
  }

  return { data: productionJob, error: null };
}

/**
 * 求人を承認（submitted → approved）
 */
export async function approveJob(draftId: string) {
  return updateJobDraftStatus(draftId, "approved");
}

/**
 * 求人を却下（submitted → rejected）
 */
export async function rejectJob(draftId: string) {
  return updateJobDraftStatus(draftId, "rejected");
}

/**
 * 説明会draftのステータスを更新（審査承認・却下）
 */
export async function updateSessionDraftStatus(draftId: string, status: "approved" | "rejected") {
  const { isAdmin } = await checkAdminPermission();

  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabaseAdmin
    .from("sessions_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    logger.error({ action: "updateSessionDraftStatus", draftId, err: draftError }, "説明会ドラフトの取得に失敗しました");
    return { data: null, error: draftError.message };
  }

  if (!draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  if (draft.draft_status !== "submitted") {
    return { data: null, error: "審査申請済みの下書きのみ承認・却下できます" };
  }

  // 本番テーブルを更新または作成
  let productionSession;
  if (draft.production_session_id) {
    // 既存の本番テーブルを更新
    const productionData: TablesUpdate<"sessions"> = {
      title: draft.title,
      type: draft.type,
      location_type: draft.location_type,
      location_detail: draft.location_detail,
      capacity: draft.capacity,
      description: draft.description,
      cover_image_url: draft.cover_image_url,
      graduation_year: draft.graduation_year,
      display_order: draft.display_order,
      status: status === "approved" ? "active" : "closed",
      updated_at: new Date().toISOString()
    } as TablesUpdate<"sessions">;

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from("sessions")
      .update(productionData)
      .eq("id", draft.production_session_id)
      .select()
      .maybeSingle();

    if (updateError) {
      logger.error({ action: "updateSessionDraftStatus", draftId, err: updateError }, "説明会本番テーブルの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    if (!updatedSession) {
      return { data: null, error: "本番テーブルの更新に失敗しました" };
    }

    productionSession = updatedSession;
  } else {
    // 新規作成（通常は発生しないが、念のため）
    const productionData: TablesInsert<"sessions"> = {
      company_id: draft.company_id,
      title: draft.title,
      type: draft.type,
      location_type: draft.location_type,
      location_detail: draft.location_detail,
      capacity: draft.capacity,
      description: draft.description,
      cover_image_url: draft.cover_image_url,
      graduation_year: draft.graduation_year,
      display_order: draft.display_order,
      created_by: draft.created_by,
      status: status === "approved" ? "active" : "closed"
    } as TablesInsert<"sessions">;

    const { data: insertedSession, error: insertError } = await supabaseAdmin
      .from("sessions")
      .insert(productionData)
      .select()
      .maybeSingle();

    if (insertError) {
      logger.error({ action: "updateSessionDraftStatus", draftId, err: insertError }, "説明会本番テーブルの作成に失敗しました");
      return { data: null, error: insertError.message };
    }

    if (!insertedSession) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionSession = insertedSession;
  }

  // 日程を本番テーブルにコピー（承認時のみ）
  if (status === "approved" && productionSession && productionSession.id) {
    console.log(`[approveSession] Copying dates for session ${productionSession.id} from draft ${draftId}`);
    
    // ドラフトの日程を取得
    const { data: draftDates, error: draftDatesError } = await supabaseAdmin
      .from("session_dates_draft")
      .select("*")
      .eq("session_draft_id", draftId);

    if (draftDatesError) {
      logger.error({ action: "updateSessionDraftStatus", draftId, err: draftDatesError }, "ドラフト日程の取得に失敗しました");
      return { data: null, error: `日程の取得に失敗しました: ${draftDatesError.message}` };
    }

    console.log(`[approveSession] Found ${draftDates?.length || 0} draft dates`);

    if (draftDates && draftDates.length > 0) {
      // 既存の本番日程を削除
      const { error: deleteError } = await supabaseAdmin
        .from("session_dates")
        .delete()
        .eq("session_id", productionSession.id);

      if (deleteError) {
        logger.error({ action: "updateSessionDraftStatus", draftId, sessionId: productionSession.id, err: deleteError }, "既存本番日程の削除に失敗しました");
        return { data: null, error: `既存日程の削除に失敗しました: ${deleteError.message}` };
      }

      console.log(`[approveSession] Deleted existing production dates for session ${productionSession.id}`);

      // ドラフト日程を本番にコピー
      const productionDates = draftDates.map((date) => ({
        session_id: productionSession.id,
        event_date: date.event_date,
        start_time: date.start_time,
        end_time: date.end_time,
        capacity: date.capacity
      }));

      const { error: insertDatesError } = await supabaseAdmin
        .from("session_dates")
        .insert(productionDates);

      if (insertDatesError) {
        logger.error({ action: "updateSessionDraftStatus", draftId, sessionId: productionSession.id, err: insertDatesError }, "本番日程のコピーに失敗しました");
        return { data: null, error: `日程のコピーに失敗しました: ${insertDatesError.message}` };
      }

      console.log(`[approveSession] Successfully copied ${productionDates.length} dates to production`);
    } else {
      console.log(`[approveSession] No draft dates found for draft ${draftId}`);
    }
  }

  // draftのstatusを更新
  // UNIQUE制約に対応: production_session_idが既に他のドラフトで使用されている場合、そのドラフトを更新
  if (status === "approved" && productionSession.id) {
    // 同じproduction_session_idを持つ既存のドラフトを確認
    const { data: existingDraft } = await supabaseAdmin
      .from("sessions_draft")
      .select("id")
      .eq("production_session_id", productionSession.id)
      .neq("id", draftId)
      .maybeSingle();

    if (existingDraft) {
      // 既存のドラフトを削除（UNIQUE制約を満たすため）
      await supabaseAdmin.from("sessions_draft").delete().eq("id", existingDraft.id);
    }
  }

  const updateData: TablesUpdate<"sessions_draft"> = {
    draft_status: status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    rejected_at: status === "rejected" ? new Date().toISOString() : null
  } as TablesUpdate<"sessions_draft">;

  if (!draft.production_session_id && productionSession) {
    (updateData as any).production_session_id = productionSession.id;
  }

  const { error: updateDraftError } = await supabaseAdmin.from("sessions_draft").update(updateData).eq("id", draftId);

  if (updateDraftError) {
    logger.error({ action: "updateSessionDraftStatus", draftId, err: updateDraftError }, "説明会ドラフトステータスの更新に失敗しました");
    return { data: null, error: updateDraftError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/sessions");
  revalidatePath("/studio/sessions");

  if (user) {
    logAudit({
      userId: user.id,
      action: status === "approved" ? "session.approve" : "session.reject",
      category: "content_review",
      resourceType: "sessions_draft",
      resourceId: draftId,
      app: "jobtv",
      metadata: { companyId: draft.company_id, sessionTitle: draft.title },
    });
  }

  return { data: productionSession, error: null };
}

/**
 * 説明会を承認（submitted → approved）
 */
export async function approveSession(draftId: string) {
  return updateSessionDraftStatus(draftId, "approved");
}

/**
 * 説明会を却下（submitted → rejected）
 */
export async function rejectSession(draftId: string) {
  return updateSessionDraftStatus(draftId, "rejected");
}

/**
 * 企業情報draftのステータスを更新（審査承認・却下）
 */
export async function updateCompanyInfoDraftStatus(draftId: string, status: "approved" | "rejected") {
  const { isAdmin } = await checkAdminPermission();

  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabaseAdmin
    .from("companies_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    logger.error({ action: "updateCompanyInfoDraftStatus", draftId, err: draftError }, "企業情報ドラフトの取得に失敗しました");
    return { data: null, error: draftError.message };
  }

  if (!draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  if (draft.draft_status !== "submitted") {
    return { data: null, error: "審査申請済みの下書きのみ承認・却下できます" };
  }

  // 本番テーブルを更新または作成
  let productionCompany;
  if (draft.production_company_id) {
    // 既存の本番テーブルを更新
    const productionData: any = {
      name: draft.name,
      website: draft.website,
      industry: draft.industry,
      employees: draft.employees,
      prefecture: (draft as any).prefecture,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      representative: draft.representative,
      established: draft.established,
      company_info: draft.company_info,
      logo_url: draft.logo_url,
      thumbnail_url: draft.thumbnail_url ?? null,
      status: status === "approved" ? "active" : "closed",
      updated_at: new Date().toISOString()
    };

    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update(productionData)
      .eq("id", draft.production_company_id)
      .select()
      .maybeSingle();

    if (updateError) {
      logger.error({ action: "updateCompanyInfoDraftStatus", draftId, err: updateError }, "企業情報本番テーブルの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    if (!updatedCompany) {
      return { data: null, error: "本番テーブルの更新に失敗しました" };
    }

    productionCompany = updatedCompany;
  } else {
    // 新規作成（通常は発生しないが、念のため）
    const productionData: any = {
      name: draft.name,
      website: draft.website,
      industry: draft.industry,
      employees: draft.employees,
      prefecture: (draft as any).prefecture,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      representative: draft.representative,
      established: draft.established,
      company_info: draft.company_info,
      logo_url: draft.logo_url,
      thumbnail_url: draft.thumbnail_url ?? null,
      status: status === "approved" ? "active" : "closed"
    };

    const { data: insertedCompany, error: insertError } = await supabaseAdmin
      .from("companies")
      .insert(productionData)
      .select()
      .maybeSingle();

    if (insertError) {
      logger.error({ action: "updateCompanyInfoDraftStatus", draftId, err: insertError }, "企業情報本番テーブルの作成に失敗しました");
      return { data: null, error: insertError.message };
    }

    if (!insertedCompany) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionCompany = insertedCompany;
  }

  // draftのstatusを更新
  // UNIQUE制約に対応: production_company_idが既に他のドラフトで使用されている場合、そのドラフトを更新
  if (status === "approved" && productionCompany.id) {
    // 同じproduction_company_idを持つ既存のドラフトを確認
    const { data: existingDraft } = await supabaseAdmin
      .from("companies_draft")
      .select("id")
      .eq("production_company_id", productionCompany.id)
      .neq("id", draftId)
      .maybeSingle();

    if (existingDraft) {
      // 既存のドラフトを削除（UNIQUE制約を満たすため）
      await supabaseAdmin.from("companies_draft").delete().eq("id", existingDraft.id);
    }
  }

  const updateData: TablesUpdate<"companies_draft"> = {
    draft_status: status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    rejected_at: status === "rejected" ? new Date().toISOString() : null
  } as TablesUpdate<"companies_draft">;

  if (!draft.production_company_id && productionCompany) {
    (updateData as any).production_company_id = productionCompany.id;
  }

  const { error: updateDraftError } = await supabaseAdmin.from("companies_draft").update(updateData).eq("id", draftId);

  if (updateDraftError) {
    logger.error({ action: "updateCompanyInfoDraftStatus", draftId, err: updateDraftError }, "企業情報ドラフトステータスの更新に失敗しました");
    return { data: null, error: updateDraftError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/companies");
  revalidatePath("/studio/settings/profile");

  if (user) {
    logAudit({
      userId: user.id,
      action: status === "approved" ? "company_info.approve" : "company_info.reject",
      category: "content_review",
      resourceType: "companies_draft",
      resourceId: draftId,
      app: "jobtv",
      metadata: { companyId: draft.company_id, companyName: draft.name },
    });
  }

  return { data: productionCompany, error: null };
}

/**
 * 企業情報を承認（submitted → approved）
 */
export async function approveCompanyInfo(draftId: string) {
  return updateCompanyInfoDraftStatus(draftId, "approved");
}

/**
 * 企業情報を却下（submitted → rejected）
 */
export async function rejectCompanyInfo(draftId: string) {
  return updateCompanyInfoDraftStatus(draftId, "rejected");
}

/**
 * 企業ページdraftを承認（submitted → approved）
 */
export async function approveCompanyPage(draftId: string) {
  const { isAdmin } = await checkAdminPermission();

  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabaseAdmin
    .from("company_pages_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    logger.error({ action: "approveCompanyPage", draftId, err: draftError }, "企業ページドラフトの取得に失敗しました");
    return { data: null, error: draftError.message };
  }

  if (!draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  if (draft.draft_status !== "submitted") {
    return { data: null, error: "審査申請済みの下書きのみ承認できます" };
  }

  // 本番テーブルを更新または作成
  // company_idで既存レコードを検索（ユニーク制約があるため）
  const { data: existingPage, error: findError } = await supabaseAdmin
    .from("company_pages")
    .select("id")
    .eq("company_id", draft.company_id)
    .maybeSingle();

  if (findError) {
    logger.error({ action: "approveCompanyPage", draftId, companyId: draft.company_id, err: findError }, "既存企業ページの検索に失敗しました");
    return { data: null, error: findError.message };
  }

  const productionData: TablesUpdate<"company_pages"> = {
    tagline: draft.tagline,
    description: draft.description,
    cover_image_url: draft.cover_image_url,
    main_video_url: draft.main_video_url,
    sns_x_url: draft.sns_x_url,
    sns_instagram_url: draft.sns_instagram_url,
    sns_tiktok_url: draft.sns_tiktok_url,
    sns_youtube_url: draft.sns_youtube_url,
    short_videos: draft.short_videos,
    documentary_videos: draft.documentary_videos,
    company_videos: draft.company_videos,
    benefits: draft.benefits,
    status: "active" as any, // 承認時は公開中に設定
    updated_at: new Date().toISOString()
  } as TablesUpdate<"company_pages">;

  let productionPage;

  if (existingPage) {
    // 既存レコードを更新
    const { data: updatedPage, error: updateError } = await supabaseAdmin
      .from("company_pages")
      .update(productionData)
      .eq("id", existingPage.id)
      .select()
      .maybeSingle();

    if (updateError) {
      logger.error({ action: "approveCompanyPage", draftId, err: updateError }, "企業ページ本番テーブルの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    if (!updatedPage) {
      return { data: null, error: "本番テーブルの更新に失敗しました" };
    }

    productionPage = updatedPage;
  } else {
    // 新規作成
    const insertData: TablesInsert<"company_pages"> = {
      company_id: draft.company_id,
      ...productionData,
      status: "active" as any // 承認時は公開中に設定
    } as TablesInsert<"company_pages">;

    const { data: insertedPage, error: insertError } = await supabaseAdmin
      .from("company_pages")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (insertError) {
      logger.error({ action: "approveCompanyPage", draftId, err: insertError }, "企業ページ本番テーブルの作成に失敗しました");
      return { data: null, error: insertError.message };
    }

    if (!insertedPage) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionPage = insertedPage;
  }

  // draftのstatusを更新
  // UNIQUE制約に対応: production_page_idが既に他のドラフトで使用されている場合、そのドラフトを更新
  if (productionPage.id) {
    // 同じproduction_page_idを持つ既存のドラフトを確認
    const { data: existingDraft } = await supabaseAdmin
      .from("company_pages_draft")
      .select("id")
      .eq("production_page_id", productionPage.id)
      .neq("id", draftId)
      .maybeSingle();

    if (existingDraft) {
      // 既存のドラフトを削除（UNIQUE制約を満たすため）
      await supabaseAdmin.from("company_pages_draft").delete().eq("id", existingDraft.id);
    }
  }

  const updateData: any = {
    draft_status: "approved",
    approved_at: new Date().toISOString(),
    production_page_id: productionPage.id
  };

  const { error: updateError } = await supabaseAdmin.from("company_pages_draft").update(updateData).eq("id", draftId);

  if (updateError) {
    logger.error({ action: "approveCompanyPage", draftId, err: updateError }, "企業ページドラフトステータスの更新に失敗しました");
    return { data: null, error: updateError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/studio/company");

  if (user) {
    logAudit({
      userId: user.id,
      action: "company_page.approve",
      category: "content_review",
      resourceType: "company_pages_draft",
      resourceId: draftId,
      app: "jobtv",
      metadata: { companyId: draft.company_id },
    });
  }

  return { data: productionPage, error: null };
}

/**
 * 企業ページdraftを却下（submitted → rejected）
 */
export async function rejectCompanyPage(draftId: string) {
  const { isAdmin } = await checkAdminPermission();

  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const supabaseAdmin = createAdminClient();

  // draftを取得（audit用にcompany_idを取得）
  const { data: draft } = await supabaseAdmin
    .from("company_pages_draft")
    .select("company_id")
    .eq("id", draftId)
    .maybeSingle();

  // draftのstatusを更新
  const { error: updateError } = await supabaseAdmin
    .from("company_pages_draft")
    .update({
      draft_status: "rejected",
      rejected_at: new Date().toISOString()
    })
    .eq("id", draftId);

  if (updateError) {
    logger.error({ action: "rejectCompanyPage", draftId, err: updateError }, "企業ページの却下処理に失敗しました");
    return { data: null, error: updateError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/studio/company");

  if (user) {
    logAudit({
      userId: user.id,
      action: "company_page.reject",
      category: "content_review",
      resourceType: "company_pages_draft",
      resourceId: draftId,
      app: "jobtv",
      metadata: { companyId: draft?.company_id },
    });
  }

  return { data: null, error: null };
}

/**
 * 審査待ちカウントのみを高速取得（COUNT クエリのみ、データ本体は取らない）
 */
export async function getReviewCounts(): Promise<{
  data: {
    "company-info": number;
    "company-pages": number;
    jobs: number;
    sessions: number;
    videos: number;
  } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const [companyInfoRes, companyPagesRes, jobsRes, sessionsRes, videosRes] = await Promise.all([
    supabaseAdmin.from("companies_draft").select("id", { count: "exact", head: true }).eq("draft_status", "submitted"),
    supabaseAdmin.from("company_pages_draft").select("id", { count: "exact", head: true }).eq("draft_status", "submitted"),
    supabaseAdmin.from("job_postings_draft").select("id", { count: "exact", head: true }).eq("draft_status", "submitted"),
    supabaseAdmin.from("sessions_draft").select("id", { count: "exact", head: true }).eq("draft_status", "submitted"),
    supabaseAdmin.from("videos_draft").select("id", { count: "exact", head: true }).eq("draft_status", "submitted")
  ]);

  const firstError = companyInfoRes.error || companyPagesRes.error || jobsRes.error || sessionsRes.error || videosRes.error;
  if (firstError) {
    return { data: null, error: firstError.message };
  }

  return {
    data: {
      "company-info": companyInfoRes.count ?? 0,
      "company-pages": companyPagesRes.count ?? 0,
      jobs: jobsRes.count ?? 0,
      sessions: sessionsRes.count ?? 0,
      videos: videosRes.count ?? 0
    },
    error: null
  };
}

/**
 * 管理者ダッシュボード用の統計情報を一括取得
 */
export async function getAdminDashboardStats(): Promise<
  | { error: string }
  | {
      error: null;
      companies: number;
      students: number;
      activeJobs: number;
      activeSessions: number;
      reviewCounts: {
        "company-info": number;
        "company-pages": number;
        jobs: number;
        sessions: number;
        videos: number;
      };
      upcomingEvents: Array<{
        id: string;
        event_date: string;
        start_time: string;
        display_name: string | null;
        form_area: string | null;
        status: string;
        event_types: { name: string } | null;
      }>;
    }
> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const todayStr = new Date().toISOString().split("T")[0];

  const [
    companiesRes, studentsRes, activeJobsRes, activeSessionsRes,
    reviewCounts, upcomingEventsRes
  ] = await Promise.all([
    supabaseAdmin.from("companies").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "candidate"),
    supabaseAdmin.from("job_postings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseAdmin.from("sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
    getReviewCounts(),
    supabaseAdmin
      .from("events")
      .select("id, event_date, start_time, display_name, form_area, status, event_types:event_type_id(name)")
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true })
      .limit(5),
  ]);

  const firstError = companiesRes.error || studentsRes.error || activeJobsRes.error || activeSessionsRes.error || upcomingEventsRes.error;
  if (firstError) {
    return { error: firstError.message };
  }
  if (reviewCounts.error) {
    return { error: reviewCounts.error };
  }

  return {
    companies: companiesRes.count ?? 0,
    students: studentsRes.count ?? 0,
    activeJobs: activeJobsRes.count ?? 0,
    activeSessions: activeSessionsRes.count ?? 0,
    reviewCounts: reviewCounts.data!,
    upcomingEvents: (upcomingEventsRes.data ?? []) as any,
    error: null,
  };
}

/**
 * 審査待ち件数のサマリーを取得
 */
export async function getReviewSummary() {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return {
    pendingJobs: 0, pendingSessions: 0, pendingCompanyPages: 0, pendingCompanyInfo: 0,
    error: "管理者権限が必要です"
  };

  const [jobsResult, sessionsResult, companyPagesResult, companyInfoResult] = await Promise.all([
    getAllJobsForReview(),
    getAllSessionsForReview(),
    getAllCompaniesForReview(),
    getAllCompanyInfoForReview()
  ]);

  return {
    pendingJobs: jobsResult.count ?? 0,
    pendingSessions: sessionsResult.count ?? 0,
    pendingCompanyPages: companyPagesResult.count ?? 0,
    pendingCompanyInfo: companyInfoResult.data?.length || 0,
    error: jobsResult.error || sessionsResult.error || companyPagesResult.error || companyInfoResult.error
  };
}
