"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { revalidatePath } from "next/cache";
import type { TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import { logAudit } from "@jobtv-app/shared/utils/audit";

// ────────────────────────────────────────────────────────────
// 企業ページ
// ────────────────────────────────────────────────────────────

export async function adminGetCompanyPageData(companyId: string) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const [productionResult, draftResult] = await Promise.all([
    supabaseAdmin
      .from("company_pages")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle(),
    supabaseAdmin
      .from("company_pages_draft")
      .select("*")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (productionResult.error) {
    return { data: null, error: productionResult.error.message };
  }

  return {
    data: {
      production: productionResult.data,
      draft: draftResult.data,
    },
    error: null,
  };
}

export async function adminSaveCompanyPage(
  companyId: string,
  data: {
    tagline?: string | null;
    description?: string | null;
    cover_image_url?: string | null;
    sns_x_url?: string | null;
    sns_instagram_url?: string | null;
    sns_tiktok_url?: string | null;
    sns_youtube_url?: string | null;
    benefits?: string[] | null;
  }
) {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const now = new Date().toISOString();

  // 1. 本番テーブルを upsert
  const { data: existingPage } = await supabaseAdmin
    .from("company_pages")
    .select("id")
    .eq("company_id", companyId)
    .maybeSingle();

  let productionPageId: string;

  if (existingPage) {
    const { data: updated, error } = await supabaseAdmin
      .from("company_pages")
      .update({
        ...data,
        status: "active",
        updated_at: now,
      } as TablesUpdate<"company_pages">)
      .eq("id", existingPage.id)
      .select("id")
      .single();
    if (error) return { data: null, error: error.message };
    productionPageId = updated.id;
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("company_pages")
      .insert({
        company_id: companyId,
        ...data,
        status: "active",
      } as TablesInsert<"company_pages">)
      .select("id")
      .single();
    if (error) return { data: null, error: error.message };
    productionPageId = inserted.id;
  }

  // 2. 同一 production_page_id を持つ既存ドラフトをクリーンアップ
  const { data: existingDrafts } = await supabaseAdmin
    .from("company_pages_draft")
    .select("id")
    .eq("production_page_id", productionPageId);

  if (existingDrafts && existingDrafts.length > 0) {
    await supabaseAdmin
      .from("company_pages_draft")
      .delete()
      .in("id", existingDrafts.map((d) => d.id));
  }

  // 3. ドラフトテーブルに upsert（承認済み）
  const { error: draftError } = await supabaseAdmin
    .from("company_pages_draft")
    .insert({
      company_id: companyId,
      ...data,
      draft_status: "approved",
      approved_at: now,
      production_page_id: productionPageId,
    } as TablesInsert<"company_pages_draft">);

  if (draftError) return { data: null, error: draftError.message };

  revalidatePath(`/admin/company-accounts/${companyId}`);
  revalidatePath(`/company/${companyId}`);

  logAudit({
    userId: userId!,
    action: "admin_company_page.save",
    category: "content_edit",
    resourceType: "company_pages_draft",
    app: "jobtv",
    metadata: { companyId },
  });

  return { data: { id: productionPageId }, error: null };
}

export async function adminUploadCompanyPageCoverImage(companyId: string, file: File) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { data: null, error: "ファイルサイズは50MB以下である必要があります" };
  }

  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimeTypes.includes(file.type)) {
    return { data: null, error: "サポートされていないファイル形式です。" };
  }

  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop();
  const fileName = `${companyId}/company-pages/admin/${timestamp}.${fileExt}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("company-assets")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) return { data: null, error: uploadError.message };

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("company-assets")
    .getPublicUrl(fileName);

  return { data: publicUrl, error: null };
}

// ────────────────────────────────────────────────────────────
// 求人
// ────────────────────────────────────────────────────────────

export async function adminGetJobsForCompany(companyId: string) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const { data: drafts, error } = await supabaseAdmin
    .from("job_postings_draft")
    .select("*, production:job_postings!production_job_id(id, status)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  const merged = (drafts || []).map((draft: any) => ({
    ...draft,
    production_status: draft.production?.status || null,
  }));

  return { data: merged, error: null };
}

export async function adminSaveJob(
  companyId: string,
  draftId: string | null,
  data: {
    title: string;
    employment_type?: string | null;
    graduation_year?: number | null;
    prefecture?: string | null;
    location_detail?: string | null;
    description?: string | null;
    requirements?: string | null;
    benefits?: string | null;
    selection_process?: string | null;
    cover_image_url?: string | null;
    available_statuses?: string[] | null;
  }
) {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const now = new Date().toISOString();

  let existingDraft: any = null;
  if (draftId) {
    const { data: d } = await supabaseAdmin
      .from("job_postings_draft")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    existingDraft = d;
  }

  // 本番テーブルを upsert
  let productionJobId: string | null = existingDraft?.production_job_id || null;

  const productionFields = {
    company_id: companyId,
    title: data.title,
    employment_type: data.employment_type,
    graduation_year: data.graduation_year,
    prefecture: data.prefecture,
    location_detail: data.location_detail,
    description: data.description,
    requirements: data.requirements,
    benefits: data.benefits,
    selection_process: data.selection_process,
    cover_image_url: data.cover_image_url,
    available_statuses: data.available_statuses,
    status: "active",
    updated_at: now,
  };

  if (productionJobId) {
    const { error } = await supabaseAdmin
      .from("job_postings")
      .update(productionFields as TablesUpdate<"job_postings">)
      .eq("id", productionJobId);
    if (error) return { data: null, error: error.message };
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("job_postings")
      .insert(productionFields as TablesInsert<"job_postings">)
      .select("id")
      .single();
    if (error) return { data: null, error: error.message };
    productionJobId = inserted.id;
  }

  // UNIQUE 制約: 同一 production_job_id を持つ既存ドラフトをクリーンアップ
  if (productionJobId) {
    const { data: dupes } = await supabaseAdmin
      .from("job_postings_draft")
      .select("id")
      .eq("production_job_id", productionJobId)
      .neq("id", draftId || "");
    if (dupes && dupes.length > 0) {
      await supabaseAdmin
        .from("job_postings_draft")
        .delete()
        .in("id", dupes.map((d) => d.id));
    }
  }

  // ドラフトテーブルを upsert
  const draftFields = {
    company_id: companyId,
    ...data,
    draft_status: "approved",
    approved_at: now,
    production_job_id: productionJobId,
  };

  if (draftId && existingDraft) {
    const { error } = await supabaseAdmin
      .from("job_postings_draft")
      .update({
        ...draftFields,
        updated_at: now,
      } as TablesUpdate<"job_postings_draft">)
      .eq("id", draftId);
    if (error) return { data: null, error: error.message };
  } else {
    const { error } = await supabaseAdmin
      .from("job_postings_draft")
      .insert(draftFields as TablesInsert<"job_postings_draft">);
    if (error) return { data: null, error: error.message };
  }

  revalidatePath(`/admin/company-accounts/${companyId}`);
  revalidatePath(`/company/${companyId}`);

  logAudit({
    userId: userId!,
    action: "admin_job.save",
    category: "content_edit",
    resourceType: "job_postings_draft",
    app: "jobtv",
    metadata: { companyId, draftId, jobTitle: data.title },
  });

  return { data: { id: productionJobId }, error: null };
}

export async function adminUploadJobCoverImage(companyId: string, file: File) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { data: null, error: "ファイルサイズは50MB以下である必要があります" };
  }

  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimeTypes.includes(file.type)) {
    return { data: null, error: "サポートされていないファイル形式です。" };
  }

  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop();
  const fileName = `${companyId}/jobs/admin/${timestamp}.${fileExt}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("company-assets")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) return { data: null, error: uploadError.message };

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("company-assets")
    .getPublicUrl(fileName);

  return { data: publicUrl, error: null };
}

export async function adminToggleJobStatus(productionId: string, status: "active" | "closed") {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const { error } = await supabaseAdmin
    .from("job_postings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", productionId);

  if (error) return { data: null, error: error.message };

  revalidatePath("/admin/company-accounts");

  logAudit({
    userId: userId!,
    action: "admin_job.toggle_status",
    category: "content_edit",
    resourceType: "job_postings",
    app: "jobtv",
    metadata: { productionId, newStatus: status },
  });

  return { data: true, error: null };
}

// ────────────────────────────────────────────────────────────
// 説明会
// ────────────────────────────────────────────────────────────

export async function adminGetSessionsForCompany(companyId: string) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const { data: drafts, error } = await supabaseAdmin
    .from("sessions_draft")
    .select("*, production:sessions!production_session_id(id, status)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  // ドラフトの日程も取得
  const draftIds = (drafts || []).map((d: any) => d.id);
  let datesMap: Record<string, any[]> = {};

  if (draftIds.length > 0) {
    const { data: allDates } = await supabaseAdmin
      .from("session_dates_draft")
      .select("*")
      .in("session_draft_id", draftIds)
      .order("event_date", { ascending: true });

    if (allDates) {
      for (const date of allDates) {
        if (!datesMap[date.session_draft_id]) datesMap[date.session_draft_id] = [];
        datesMap[date.session_draft_id].push(date);
      }
    }
  }

  const merged = (drafts || []).map((draft: any) => ({
    ...draft,
    production_status: draft.production?.status || null,
    dates: datesMap[draft.id] || [],
  }));

  return { data: merged, error: null };
}

export async function adminSaveSession(
  companyId: string,
  draftId: string | null,
  data: {
    title: string;
    type?: string | null;
    location_type?: string | null;
    location_detail?: string | null;
    capacity?: number | null;
    graduation_year?: number | null;
    description?: string | null;
    cover_image_url?: string | null;
  },
  dates: Array<{ event_date: string; start_time: string; end_time: string; capacity?: number | null }>
) {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const now = new Date().toISOString();

  let existingDraft: any = null;
  if (draftId) {
    const { data: d } = await supabaseAdmin
      .from("sessions_draft")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    existingDraft = d;
  }

  // 本番テーブルを upsert
  let productionSessionId: string | null = existingDraft?.production_session_id || null;

  const productionFields = {
    company_id: companyId,
    title: data.title,
    type: data.type,
    location_type: data.location_type,
    location_detail: data.location_detail,
    capacity: data.capacity,
    graduation_year: data.graduation_year,
    description: data.description,
    cover_image_url: data.cover_image_url,
    status: "active",
    updated_at: now,
  };

  if (productionSessionId) {
    const { error } = await supabaseAdmin
      .from("sessions")
      .update(productionFields as TablesUpdate<"sessions">)
      .eq("id", productionSessionId);
    if (error) return { data: null, error: error.message };
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("sessions")
      .insert(productionFields as TablesInsert<"sessions">)
      .select("id")
      .single();
    if (error) return { data: null, error: error.message };
    productionSessionId = inserted.id;
  }

  // 本番日程を削除して新規挿入
  if (productionSessionId) {
    await supabaseAdmin
      .from("session_dates")
      .delete()
      .eq("session_id", productionSessionId);

    if (dates.length > 0) {
      const productionDates = dates.map((d) => ({
        session_id: productionSessionId!,
        event_date: d.event_date,
        start_time: d.start_time,
        end_time: d.end_time,
        capacity: d.capacity || null,
      }));
      const { error: datesError } = await supabaseAdmin
        .from("session_dates")
        .insert(productionDates);
      if (datesError) return { data: null, error: `日程の保存に失敗: ${datesError.message}` };
    }
  }

  // UNIQUE 制約: 同一 production_session_id を持つ既存ドラフトをクリーンアップ
  if (productionSessionId) {
    const { data: dupes } = await supabaseAdmin
      .from("sessions_draft")
      .select("id")
      .eq("production_session_id", productionSessionId)
      .neq("id", draftId || "");
    if (dupes && dupes.length > 0) {
      await supabaseAdmin
        .from("sessions_draft")
        .delete()
        .in("id", dupes.map((d) => d.id));
    }
  }

  // ドラフトテーブルを upsert
  const draftFields = {
    company_id: companyId,
    ...data,
    draft_status: "approved",
    approved_at: now,
    production_session_id: productionSessionId,
  };

  let finalDraftId = draftId;

  if (draftId && existingDraft) {
    const { error } = await supabaseAdmin
      .from("sessions_draft")
      .update({
        ...draftFields,
        updated_at: now,
      } as TablesUpdate<"sessions_draft">)
      .eq("id", draftId);
    if (error) return { data: null, error: error.message };
  } else {
    const { data: inserted, error } = await supabaseAdmin
      .from("sessions_draft")
      .insert(draftFields as TablesInsert<"sessions_draft">)
      .select("id")
      .single();
    if (error) return { data: null, error: error.message };
    finalDraftId = inserted.id;
  }

  // ドラフト日程も保存
  if (finalDraftId) {
    await supabaseAdmin
      .from("session_dates_draft")
      .delete()
      .eq("session_draft_id", finalDraftId);

    if (dates.length > 0) {
      const draftDates = dates.map((d) => ({
        session_draft_id: finalDraftId!,
        event_date: d.event_date,
        start_time: d.start_time,
        end_time: d.end_time,
        capacity: d.capacity || null,
      }));
      await supabaseAdmin.from("session_dates_draft").insert(draftDates);
    }
  }

  revalidatePath(`/admin/company-accounts/${companyId}`);
  revalidatePath(`/company/${companyId}`);

  logAudit({
    userId: userId!,
    action: "admin_session.save",
    category: "content_edit",
    resourceType: "sessions_draft",
    app: "jobtv",
    metadata: { companyId, draftId: finalDraftId },
  });

  return { data: { id: productionSessionId }, error: null };
}

export async function adminUploadSessionCoverImage(companyId: string, file: File) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return { data: null, error: "ファイルサイズは50MB以下である必要があります" };
  }

  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedMimeTypes.includes(file.type)) {
    return { data: null, error: "サポートされていないファイル形式です。" };
  }

  const timestamp = Date.now();
  const fileExt = file.name.split(".").pop();
  const fileName = `${companyId}/sessions/admin/${timestamp}.${fileExt}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("company-assets")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });

  if (uploadError) return { data: null, error: uploadError.message };

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("company-assets")
    .getPublicUrl(fileName);

  return { data: publicUrl, error: null };
}

// ────────────────────────────────────────────────────────────
// 動画
// ────────────────────────────────────────────────────────────

export async function adminGetVideosForCompany(companyId: string) {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();

  const { data: drafts, error } = await supabaseAdmin
    .from("videos_draft")
    .select("*, production:videos!videos_draft_production_video_id_fkey(id, status)")
    .eq("company_id", companyId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };

  const merged = (drafts || []).map((draft: any) => ({
    ...draft,
    production_status: draft.production?.status || null,
  }));

  return { data: merged, error: null };
}

export async function adminSaveVideo(
  companyId: string,
  draftId: string | null,
  data: {
    title: string;
    category: string;
    display_order?: number | null;
  }
) {
  const { isAdmin, userId } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseAdmin = createAdminClient();
  const now = new Date().toISOString();

  let existingDraft: any = null;
  if (draftId) {
    const { data: d } = await supabaseAdmin
      .from("videos_draft")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    existingDraft = d;
  }

  // 新規作成（ドラフトIDなし）: ドラフトのみ作成（動画ファイルは後でアップロード）
  if (!existingDraft) {
    const { data: inserted, error } = await supabaseAdmin
      .from("videos_draft")
      .insert({
        company_id: companyId,
        title: data.title,
        category: data.category,
        display_order: data.display_order,
        draft_status: "draft",
      } as TablesInsert<"videos_draft">)
      .select("id")
      .single();
    if (error) return { data: null, error: error.message };

    revalidatePath(`/admin/company-accounts/${companyId}`);
    return { data: { id: inserted.id, draftOnly: true }, error: null };
  }

  // 変換未完了の場合はドラフトのみ保存
  if (existingDraft.conversion_status !== "completed") {
    const { error } = await supabaseAdmin
      .from("videos_draft")
      .update({
        title: data.title,
        category: data.category,
        display_order: data.display_order,
        updated_at: now,
      } as TablesUpdate<"videos_draft">)
      .eq("id", draftId);
    if (error) return { data: null, error: error.message };

    return { data: { id: draftId, draftOnly: true }, error: null };
  }

  // 変換完了済み: streaming_url を決定
  let streamingUrl = existingDraft?.streaming_url;
  if (!streamingUrl && existingDraft) {
    const cloudFrontBase = process.env.AWS_CLOUDFRONT_URL?.replace(/\/$/, "");
    if (cloudFrontBase) {
      const ar = existingDraft.aspect_ratio === "portrait" ? "portrait" : "landscape";
      streamingUrl = `${cloudFrontBase}/companies/${existingDraft.company_id}/videos/${existingDraft.id}/hls/${ar}/original.m3u8`;
    }
  }

  if (!streamingUrl && existingDraft) {
    return { data: null, error: "HLS動画のURLを特定できません。" };
  }

  // 本番テーブルを upsert
  let productionVideoId: string | null = existingDraft?.production_video_id || null;

  if (productionVideoId) {
    const { error } = await supabaseAdmin
      .from("videos")
      .update({
        title: data.title,
        category: data.category,
        display_order: data.display_order,
        video_url: streamingUrl,
        streaming_url: streamingUrl,
        source_url: existingDraft?.video_url,
        auto_thumbnail_url: existingDraft?.auto_thumbnail_url,
        thumbnail_url: existingDraft?.thumbnail_url,
        status: "active",
        updated_at: now,
      } as TablesUpdate<"videos">)
      .eq("id", productionVideoId);
    if (error) return { data: null, error: error.message };
  } else {
    // メインビデオの場合、既存を非公開にする
    if (data.category === "main") {
      await supabaseAdmin
        .from("videos")
        .update({ status: "closed" })
        .eq("company_id", companyId)
        .eq("category", "main");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("videos")
      .insert({
        company_id: companyId,
        title: data.title,
        category: data.category,
        display_order: data.display_order,
        video_url: streamingUrl,
        streaming_url: streamingUrl,
        source_url: existingDraft?.video_url,
        auto_thumbnail_url: existingDraft?.auto_thumbnail_url,
        thumbnail_url: existingDraft?.thumbnail_url,
        status: "active",
      } as TablesInsert<"videos">)
      .select("id")
      .single();
    if (error) return { data: null, error: error.message };
    productionVideoId = inserted.id;
  }

  // ドラフトを更新
  if (draftId && existingDraft) {
    const { error } = await supabaseAdmin
      .from("videos_draft")
      .update({
        title: data.title,
        category: data.category,
        display_order: data.display_order,
        draft_status: "approved",
        approved_at: now,
        production_video_id: productionVideoId,
        updated_at: now,
      } as TablesUpdate<"videos_draft">)
      .eq("id", draftId);
    if (error) return { data: null, error: error.message };
  }

  revalidatePath(`/admin/company-accounts/${companyId}`);
  revalidatePath(`/company/${companyId}`);

  logAudit({
    userId: userId!,
    action: "admin_video.save",
    category: "content_edit",
    resourceType: "videos_draft",
    app: "jobtv",
    metadata: { companyId, draftId },
  });

  return { data: { id: productionVideoId }, error: null };
}
