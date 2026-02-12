"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Tables, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

/**
 * 管理者権限をチェック
 */
export async function checkAdminPermission(): Promise<{
  isAdmin: boolean;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { isAdmin: false, error: "ログインが必要です" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { isAdmin: false, error: "ユーザー情報が見つかりません" };
  }

  const isAdmin = profile.role === "admin";

  return { isAdmin, error: null };
}

/**
 * 管理者権限をチェックし、権限がない場合はリダイレクト
 */
export async function requireAdmin() {
  const { isAdmin, error } = await checkAdminPermission();

  if (error || !isAdmin) {
    redirect("/studio");
  }
}

/**
 * 審査待ちの求人一覧を取得（全企業）
 */
export async function getAllJobsForReview() {
  const supabase = await createClient();

  // デバッグ: 全てのドラフトステータスを確認
  const { data: allDrafts, error: allDraftsError } = await supabase
    .from("job_postings_draft")
    .select("id, title, draft_status, submitted_at, company_id, production_job_id")
    .limit(20);

  const statusCounts =
    allDrafts?.reduce((acc: any, draft: any) => {
      acc[draft.draft_status] = (acc[draft.draft_status] || 0) + 1;
      return acc;
    }, {}) || {};

  console.log("getAllJobsForReview: All drafts sample (first 20):", {
    totalDrafts: allDrafts?.length || 0,
    statusCounts,
    allDrafts: allDrafts?.map((d: any) => ({
      id: d.id,
      title: d.title,
      draft_status: d.draft_status,
      submitted_at: d.submitted_at,
      company_id: d.company_id,
      production_job_id: d.production_job_id
    })),
    allDraftsError
  });

  // 求人の審査はjob_postings_draftテーブルから取得
  console.log("getAllJobsForReview: Querying job_postings_draft with draft_status=submitted");
  const { data: drafts, error: draftsError } = await supabase
    .from("job_postings_draft")
    .select(
      `
      *,
      companies!company_id(id, name)
    `
    )
    .eq("draft_status", "submitted")
    .order("submitted_at", { ascending: false });

  console.log("getAllJobsForReview: Query result:", {
    draftsCount: drafts?.length || 0,
    error: draftsError,
    drafts: drafts?.map((draft: any) => ({
      id: draft.id,
      title: draft.title,
      draft_status: draft.draft_status,
      submitted_at: draft.submitted_at,
      production_job_id: draft.production_job_id,
      company_id: draft.company_id
    }))
  });

  if (draftsError) {
    console.error("Get all job drafts for review error:", draftsError);
    return { data: null, error: draftsError.message };
  }

  // ドラフトデータと企業データをマージ
  const mergedData = (drafts || []).map((draft: any) => {
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
      // 審査用のID（draftのID） - 重要: このIDを使ってプレビューを開く
      draft_id: draft.id,
      production_job_id: draft.production_job_id,
      // 本番テーブルのIDとしてproduction_job_idを使用（なければdraft.id）
      id: draft.production_job_id || draft.id
    };
    console.log("Merged job data:", {
      draft_id: merged.draft_id,
      production_job_id: merged.production_job_id,
      id: merged.id,
      title: merged.title
    });
    return merged;
  });

  console.log("getAllJobsForReview returning:", mergedData.length, "jobs");
  return { data: mergedData || [], error: null };
}

/**
 * 審査待ちの説明会一覧を取得（全企業）
 */
export async function getAllSessionsForReview() {
  const supabase = await createClient();

  // デバッグ: 全てのドラフトステータスを確認
  const { data: allDrafts, error: allDraftsError } = await supabase
    .from("sessions_draft")
    .select("id, title, draft_status, submitted_at, company_id, production_session_id")
    .limit(20);

  const statusCounts =
    allDrafts?.reduce((acc: any, draft: any) => {
      acc[draft.draft_status] = (acc[draft.draft_status] || 0) + 1;
      return acc;
    }, {}) || {};

  console.log("getAllSessionsForReview: All drafts sample (first 20):", {
    totalDrafts: allDrafts?.length || 0,
    statusCounts,
    allDrafts: allDrafts?.map((d: any) => ({
      id: d.id,
      title: d.title,
      draft_status: d.draft_status,
      submitted_at: d.submitted_at,
      company_id: d.company_id,
      production_session_id: d.production_session_id
    })),
    allDraftsError
  });

  // 説明会の審査はsessions_draftテーブルから取得
  console.log("getAllSessionsForReview: Querying sessions_draft with draft_status=submitted");
  const { data: drafts, error: draftsError } = await supabase
    .from("sessions_draft")
    .select(
      `
      *,
      companies!company_id(id, name)
    `
    )
    .eq("draft_status", "submitted")
    .order("submitted_at", { ascending: false });

  console.log("getAllSessionsForReview: Query result:", {
    draftsCount: drafts?.length || 0,
    error: draftsError,
    drafts: drafts?.map((draft: any) => ({
      id: draft.id,
      title: draft.title,
      draft_status: draft.draft_status,
      submitted_at: draft.submitted_at,
      production_session_id: draft.production_session_id,
      company_id: draft.company_id
    }))
  });

  if (draftsError) {
    console.error("Get all session drafts for review error:", draftsError);
    return { data: null, error: draftsError.message };
  }

  // ドラフトデータと企業データをマージ
  const mergedData = (drafts || []).map((draft: any) => {
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
      // 審査用のID（draftのID） - 重要: このIDを使ってプレビューを開く
      draft_id: draft.id,
      production_session_id: draft.production_session_id,
      // 本番テーブルのIDとしてproduction_session_idを使用（なければdraft.id）
      id: draft.production_session_id || draft.id
    };
    console.log("Merged session data:", {
      draft_id: merged.draft_id,
      production_session_id: merged.production_session_id,
      id: merged.id,
      title: merged.title
    });
    return merged;
  });

  console.log("getAllSessionsForReview returning:", mergedData.length, "sessions");
  return { data: mergedData || [], error: null };
}

/**
 * 審査待ちの企業情報（companies）一覧を取得
 */
export async function getAllCompanyInfoForReview() {
  const supabase = await createClient();

  // 企業情報の審査はcompanies_draftテーブルから取得
  // company_idのリレーションシップを明示的に指定
  const { data: drafts, error: draftsError } = await supabase
    .from("companies_draft")
    .select(
      `
      *,
      companies!company_id(id, name, logo_url, website, industry, employees, location, address, address_line1, address_line2, representative, established, company_info)
    `
    )
    .eq("draft_status", "submitted")
    .order("submitted_at", { ascending: false });

  if (draftsError) {
    console.error("Get all company info drafts for review error:", draftsError);
    return { data: null, error: draftsError.message };
  }

  // ドラフトデータと企業データをマージ
  const mergedData = (drafts || []).map((draft: any) => {
    const merged = {
      ...draft.companies,
      ...draft,
      // 企業情報のデータを優先
      // 審査用のID（draftのID）
      draft_id: draft.id,
      production_company_id: draft.production_company_id,
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
export async function getAllCompaniesForReview() {
  const supabase = await createClient();

  // 企業ページの審査はcompany_pages_draftテーブルから取得
  console.log("getAllCompaniesForReview: Querying company_pages_draft with status=submitted");
  const { data: drafts, error: draftsError } = await supabase
    .from("company_pages_draft")
    .select(
      `
      *,
      companies!company_id(id, name, logo_url, website, industry, employees, location, address, address_line1, address_line2, representative, established, company_info)
    `
    )
    .eq("draft_status", "submitted")
    .order("submitted_at", { ascending: false });

  console.log("getAllCompaniesForReview: Query result:", {
    draftsCount: drafts?.length || 0,
    error: draftsError,
    drafts: drafts
  });

  if (draftsError) {
    console.error("Get all company pages for review error:", draftsError);
    return { data: null, error: draftsError.message };
  }

  // デバッグ: 全てのドラフトステータスを確認
  const { data: allDrafts, error: allDraftsError } = await supabase
    .from("company_pages_draft")
    .select("id, draft_status, company_id")
    .limit(10);

  console.log("getAllCompaniesForReview: All drafts sample (first 10):", {
    allDrafts,
    allDraftsError
  });

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
      production_page_id: draft.production_page_id
    };
    console.log("Merged company data:", {
      draft_id: merged.draft_id,
      company_id: merged.id,
      company_name: merged.name
    });
    return merged;
  });

  console.log("getAllCompaniesForReview returning:", mergedData.length, "companies");
  return { data: mergedData || [], error: null };
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

  // draftを取得
  console.log("updateJobDraftStatus: Fetching draft", { draftId });
  const { data: draft, error: draftError } = await supabase
    .from("job_postings_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Get job draft error:", draftError);
    return { data: null, error: draftError.message };
  }

  if (!draft) {
    console.error("updateJobDraftStatus: Draft not found", { draftId });
    return { data: null, error: "下書きが見つかりません" };
  }

  console.log("updateJobDraftStatus: Draft found", {
    draftId: draft.id,
    draft_status: draft.draft_status,
    production_job_id: draft.production_job_id,
    company_id: draft.company_id
  });

  if (draft.draft_status !== "submitted") {
    return { data: null, error: "審査申請済みの下書きのみ承認・却下できます" };
  }

  // 本番テーブルを更新または作成
  let productionJob;
  if (draft.production_job_id) {
    // 既存の本番テーブルを更新
    console.log("updateJobDraftStatus: Updating existing production job", {
      draftId,
      production_job_id: draft.production_job_id,
      status
    });

    const productionData: TablesUpdate<"job_postings"> = {
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
      status: status === "approved" ? "active" : "closed",
      updated_at: new Date().toISOString()
    } as TablesUpdate<"job_postings">;

    const { data: updatedJob, error: updateError } = await supabase
      .from("job_postings")
      .update(productionData)
      .eq("id", draft.production_job_id)
      .select()
      .maybeSingle();

    console.log("updateJobDraftStatus: Update result", {
      hasUpdatedJob: !!updatedJob,
      updateError,
      production_job_id: draft.production_job_id
    });

    if (updateError) {
      console.error("Update job for approval error:", updateError);
      return { data: null, error: updateError.message };
    }

    if (!updatedJob) {
      // 本番テーブルに該当レコードが存在しない可能性がある
      console.error("updateJobDraftStatus: Production job not found", {
        production_job_id: draft.production_job_id
      });
      // 新規作成にフォールバック
      console.log("updateJobDraftStatus: Falling back to create new production job");
    } else {
      productionJob = updatedJob;
    }
  }

  // production_job_idがない場合、または更新に失敗した場合は新規作成
  if (!productionJob) {
    console.log("updateJobDraftStatus: Creating new production job", {
      draftId,
      company_id: draft.company_id,
      status
    });

    const productionData: TablesInsert<"job_postings"> = {
      company_id: draft.company_id,
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
      created_by: draft.created_by,
      status: status === "approved" ? "active" : "closed"
    } as TablesInsert<"job_postings">;

    const { data: insertedJob, error: insertError } = await supabase
      .from("job_postings")
      .insert(productionData)
      .select()
      .maybeSingle();

    console.log("updateJobDraftStatus: Insert result", {
      hasInsertedJob: !!insertedJob,
      insertError
    });

    if (insertError) {
      console.error("Create job for approval error:", insertError);
      return { data: null, error: insertError.message };
    }

    if (!insertedJob) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionJob = insertedJob;
  }

  // draftのstatusを更新
  const updateData: TablesUpdate<"job_postings_draft"> = {
    draft_status: status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    rejected_at: status === "rejected" ? new Date().toISOString() : null
  } as TablesUpdate<"job_postings_draft">;

  if (!draft.production_job_id) {
    (updateData as any).production_job_id = productionJob.id;
  }

  const { error: updateDraftError } = await supabase.from("job_postings_draft").update(updateData).eq("id", draftId);

  if (updateDraftError) {
    console.error("Update job draft status error:", updateDraftError);
    return { data: null, error: updateDraftError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/jobs");
  revalidatePath("/studio/jobs");
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

  // draftを取得
  const { data: draft, error: draftError } = await supabase
    .from("sessions_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Get session draft error:", draftError);
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
      status: status === "approved" ? "active" : "closed",
      updated_at: new Date().toISOString()
    } as TablesUpdate<"sessions">;

    const { data: updatedSession, error: updateError } = await supabase
      .from("sessions")
      .update(productionData)
      .eq("id", draft.production_session_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Update session for approval error:", updateError);
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
      created_by: draft.created_by,
      status: status === "approved" ? "active" : "closed"
    } as TablesInsert<"sessions">;

    const { data: insertedSession, error: insertError } = await supabase
      .from("sessions")
      .insert(productionData)
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("Create session for approval error:", insertError);
      return { data: null, error: insertError.message };
    }

    if (!insertedSession) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionSession = insertedSession;
  }

  // draftのstatusを更新
  const updateData: TablesUpdate<"sessions_draft"> = {
    draft_status: status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    rejected_at: status === "rejected" ? new Date().toISOString() : null
  } as TablesUpdate<"sessions_draft">;

  if (!draft.production_session_id) {
    (updateData as any).production_session_id = productionSession.id;
  }

  const { error: updateDraftError } = await supabase.from("sessions_draft").update(updateData).eq("id", draftId);

  if (updateDraftError) {
    console.error("Update session draft status error:", updateDraftError);
    return { data: null, error: updateDraftError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/sessions");
  revalidatePath("/studio/sessions");
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

  // draftを取得
  const { data: draft, error: draftError } = await supabase
    .from("companies_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Get company draft error:", draftError);
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
    const productionData: TablesUpdate<"companies"> = {
      name: draft.name,
      website: draft.website,
      industry: draft.industry,
      employees: draft.employees,
      location: draft.location,
      address: draft.address,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      representative: draft.representative,
      established: draft.established,
      company_info: draft.company_info,
      logo_url: draft.logo_url,
      status: status === "approved" ? "active" : "closed",
      updated_at: new Date().toISOString()
    } as TablesUpdate<"companies">;

    const { data: updatedCompany, error: updateError } = await supabase
      .from("companies")
      .update(productionData)
      .eq("id", draft.production_company_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Update company for approval error:", updateError);
      return { data: null, error: updateError.message };
    }

    if (!updatedCompany) {
      return { data: null, error: "本番テーブルの更新に失敗しました" };
    }

    productionCompany = updatedCompany;
  } else {
    // 新規作成（通常は発生しないが、念のため）
    const productionData: TablesInsert<"companies"> = {
      name: draft.name,
      website: draft.website,
      industry: draft.industry,
      employees: draft.employees,
      location: draft.location,
      address: draft.address,
      address_line1: draft.address_line1,
      address_line2: draft.address_line2,
      representative: draft.representative,
      established: draft.established,
      company_info: draft.company_info,
      logo_url: draft.logo_url,
      status: status === "approved" ? "active" : "closed"
    } as TablesInsert<"companies">;

    const { data: insertedCompany, error: insertError } = await supabase
      .from("companies")
      .insert(productionData)
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("Create company for approval error:", insertError);
      return { data: null, error: insertError.message };
    }

    if (!insertedCompany) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionCompany = insertedCompany;
  }

  // draftのstatusを更新
  const updateData: TablesUpdate<"companies_draft"> = {
    draft_status: status,
    approved_at: status === "approved" ? new Date().toISOString() : null,
    rejected_at: status === "rejected" ? new Date().toISOString() : null
  } as TablesUpdate<"companies_draft">;

  if (!draft.production_company_id) {
    (updateData as any).production_company_id = productionCompany.id;
  }

  const { error: updateDraftError } = await supabase.from("companies_draft").update(updateData).eq("id", draftId);

  if (updateDraftError) {
    console.error("Update company draft status error:", updateDraftError);
    return { data: null, error: updateDraftError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/companies");
  revalidatePath("/studio/settings");
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

  // draftを取得
  const { data: draft, error: draftError } = await supabase
    .from("company_pages_draft")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();

  if (draftError) {
    console.error("Get company page draft error:", draftError);
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
  const { data: existingPage, error: findError } = await supabase
    .from("company_pages")
    .select("id")
    .eq("company_id", draft.company_id)
    .maybeSingle();

  if (findError) {
    console.error("Find existing company page error:", findError);
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
    updated_at: new Date().toISOString()
  } as TablesUpdate<"company_pages">;

  let productionPage;

  if (existingPage) {
    // 既存レコードを更新
    const { data: updatedPage, error: updateError } = await supabase
      .from("company_pages")
      .update(productionData)
      .eq("id", existingPage.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Update company page for approval error:", updateError);
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
      ...productionData
    } as TablesInsert<"company_pages">;

    const { data: insertedPage, error: insertError } = await supabase
      .from("company_pages")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("Create company page for approval error:", insertError);
      return { data: null, error: insertError.message };
    }

    if (!insertedPage) {
      return { data: null, error: "本番テーブルの作成に失敗しました" };
    }

    productionPage = insertedPage;
  }

  // draftのstatusを更新
  const updateData: any = {
    draft_status: "approved",
    approved_at: new Date().toISOString(),
    production_page_id: productionPage.id
  };

  const { error: updateError } = await supabase.from("company_pages_draft").update(updateData).eq("id", draftId);

  if (updateError) {
    console.error("Update draft status error:", updateError);
    return { data: null, error: updateError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/studio/company");
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

  // draftのstatusを更新
  const { error: updateError } = await supabase
    .from("company_pages_draft")
    .update({
      draft_status: "rejected",
      rejected_at: new Date().toISOString()
    })
    .eq("id", draftId);

  if (updateError) {
    console.error("Reject company page error:", updateError);
    return { data: null, error: updateError.message };
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin");
  revalidatePath("/studio/company");
  return { data: null, error: null };
}

/**
 * 審査待ち件数のサマリーを取得
 */
export async function getReviewSummary() {
  const [jobsResult, sessionsResult, companiesResult] = await Promise.all([
    getAllJobsForReview(),
    getAllSessionsForReview(),
    getAllCompaniesForReview()
  ]);

  return {
    pendingJobs: jobsResult.data?.length || 0,
    pendingSessions: sessionsResult.data?.length || 0,
    pendingCompanies: companiesResult.data?.length || 0,
    error: jobsResult.error || sessionsResult.error || companiesResult.error
  };
}
