"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

export type JobData = Partial<TablesInsert<"job_postings">> & { id?: string };
export type JobDraftData = Partial<TablesInsert<"job_postings_draft">> & { id?: string };

/**
 * 求人を作成
 */
export async function createJob(data: Omit<JobData, "id" | "created_by">) {
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

  const jobData: TablesInsert<"job_postings"> = {
    ...data,
    company_id: profile.company_id,
    created_by: user.id,
    // 新規作成時は常にpending（審査中）ステータス
    status: "pending" as const
  } as TablesInsert<"job_postings">;

  const { data: result, error } = await supabase.from("job_postings").insert(jobData).select().single();

  if (error) {
    console.error("Create job error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/jobs");
  return { data: result, error: null };
}

/**
 * 求人を更新
 */
export async function updateJob(
  id: string,
  data: Partial<Omit<JobData, "id" | "created_by" | "company_id" | "status">>
) {
  const supabase = await createClient();

  // statusは企業管理画面から変更不可（管理者のみ変更可能）
  const { status, ...updateDataWithoutStatus } = data;

  const updateData: TablesUpdate<"job_postings"> = {
    ...updateDataWithoutStatus,
    updated_at: new Date().toISOString()
  } as TablesUpdate<"job_postings">;

  const { data: result, error } = await supabase.from("job_postings").update(updateData).eq("id", id).select().single();

  if (error) {
    console.error("Update job error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/jobs");
  return { data: result, error: null };
}

/**
 * 求人を削除
 */
export async function deleteJob(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("job_postings").delete().eq("id", id);

  if (error) {
    console.error("Delete job error:", error);
    return { error: error.message };
  }

  revalidatePath("/studio/jobs");
  return { error: null };
}

/**
 * 求人一覧を取得（ログインユーザーの企業の求人のみ）
 */
export async function getJobs() {
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
    .from("job_postings")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get jobs error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 単一の求人を取得
 */
export async function getJob(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("job_postings").select("*").eq("id", id).single();

  if (error) {
    console.error("Get job error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as JobData, error: null };
}

/**
 * 求人の応募数を取得
 */
export async function getJobApplicationCount(jobId: string) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("job_posting_id", jobId);

  if (error) {
    console.error("Get job application count error:", error);
    return { data: null, error: error.message };
  }

  return { data: count || 0, error: null };
}

/**
 * 求人のカバー画像をSupabase Storageにアップロード
 */
export async function uploadJobCoverImage(
  file: File,
  jobId?: string
): Promise<{
  data: string | null; // アップロードされたファイルのURL
  error: string | null;
}> {
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

    // ファイルサイズチェック（50MB以下）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return { data: null, error: "ファイルサイズは50MB以下である必要があります" };
    }

    // MIMEタイプチェック（画像のみ）
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedMimeTypes.includes(file.type)) {
      return {
        data: null,
        error: "サポートされていないファイル形式です。画像（JPEG, PNG, WebP, GIF）をアップロードしてください。"
      };
    }

    // ファイル名を生成（companyId/jobs/jobId-or-temp/timestamp-originalname）
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = jobId
      ? `${profile.company_id}/jobs/${jobId}/${timestamp}.${fileExt}`
      : `${profile.company_id}/jobs/temp/${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload job cover image error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error("Upload job cover image error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}

/**
 * 複数の求人の応募数を一括取得
 */
export async function getJobApplicationCounts(jobIds: string[]) {
  const supabase = await createClient();

  if (jobIds.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase.from("applications").select("job_posting_id").in("job_posting_id", jobIds);

  if (error) {
    console.error("Get job application counts error:", error);
    return { data: null, error: error.message };
  }

  // 各求人IDごとに応募数をカウント
  const counts: Record<string, number> = {};
  jobIds.forEach((id) => {
    counts[id] = 0;
  });
  data?.forEach((app) => {
    if (app.job_posting_id) {
      counts[app.job_posting_id] = (counts[app.job_posting_id] || 0) + 1;
    }
  });

  return { data: counts, error: null };
}

/**
 * 求人draftを作成
 */
export async function createJobDraft(
  data: Omit<
    JobDraftData,
    "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_job_id"
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

  const draftData: TablesInsert<"job_postings_draft"> = {
    ...data,
    company_id: profile.company_id,
    created_by: user.id,
    draft_status: "draft"
  } as TablesInsert<"job_postings_draft">;

  const { data: result, error } = await supabase.from("job_postings_draft").insert(draftData).select().single();

  if (error) {
    console.error("Create job draft error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/jobs");
  return { data: result, error: null };
}

/**
 * 求人draftを更新
 */
export async function updateJobDraft(
  id: string,
  data: Partial<
    Omit<
      JobDraftData,
      | "id"
      | "created_by"
      | "company_id"
      | "draft_status"
      | "submitted_at"
      | "approved_at"
      | "rejected_at"
      | "production_job_id"
    >
  >
) {
  const supabase = await createClient();

  // 現在のdraftを取得して、draft_statusを確認
  const { data: currentDraft, error: fetchError } = await supabase
    .from("job_postings_draft")
    .select("draft_status")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Get job draft error:", fetchError);
    return { data: null, error: fetchError.message };
  }

  // submittedまたはapprovedの場合はdraftに戻す（編集可能にする）
  const updateData: TablesUpdate<"job_postings_draft"> = {
    ...data,
    updated_at: new Date().toISOString()
  } as TablesUpdate<"job_postings_draft">;

  if (currentDraft?.draft_status === "submitted" || currentDraft?.draft_status === "approved") {
    (updateData as any).draft_status = "draft";
    (updateData as any).submitted_at = null;
    (updateData as any).approved_at = null;
  }

  const { data: result, error } = await supabase
    .from("job_postings_draft")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update job draft error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/jobs");
  return { data: result, error: null };
}

/**
 * 求人draftを取得（最新のdraftまたはrejectedを取得）
 */
export async function getJobDraft(id: string) {
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

  // 指定されたIDのdraftを取得
  const { data: draftById, error: draftByIdError } = await supabase
    .from("job_postings_draft")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (draftByIdError || !draftById) {
    // IDで見つからない場合、最新のdraftまたはrejectedを取得
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("job_postings_draft")
      .select("*")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      console.error("Get job draft error:", latestDraftError);
      return { data: null, error: latestDraftError.message };
    }

    if (!latestDraft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    return { data: latestDraft as JobDraftData, error: null };
  }

  // 取得したdraftがsubmittedまたはapprovedの場合、最新のdraftまたはrejectedを取得
  if (draftById.draft_status === "submitted" || draftById.draft_status === "approved") {
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("job_postings_draft")
      .select("*")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      console.error("Get job draft error:", latestDraftError);
      return { data: null, error: latestDraftError.message };
    }

    if (latestDraft) {
      return { data: latestDraft as JobDraftData, error: null };
    }
  }

  return { data: draftById as JobDraftData, error: null };
}

/**
 * 求人draft一覧を取得（ログインユーザーの企業のdraftのみ）
 */
export async function getJobDrafts() {
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
    .from("job_postings_draft")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get job drafts error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 求人draftを審査申請（本番テーブルにコピー）
 */
export async function submitJobForReview(draftId: string) {
  const supabase = await createClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabase
    .from("job_postings_draft")
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
  const updateData = {
    draft_status: "submitted" as const,
    submitted_at: new Date().toISOString()
  };

  console.log("submitJobForReview: Updating draft with:", {
    draftId,
    updateData,
    currentDraftStatus: draft.draft_status
  });

  const { data: updatedDraft, error: updateError } = await supabase
    .from("job_postings_draft")
    .update(updateData)
    .eq("id", draftId)
    .select()
    .single();

  console.log("submitJobForReview: Update result:", {
    updatedDraft,
    updateError,
    newDraftStatus: updatedDraft?.draft_status
  });

  if (updateError) {
    console.error("Update draft status error:", updateError);
    return { data: null, error: updateError.message };
  }

  // 更新後の状態を確認
  if (updatedDraft?.draft_status !== "submitted") {
    console.error("submitJobForReview: Draft status was not updated to 'submitted'", {
      expected: "submitted",
      actual: updatedDraft?.draft_status
    });
    return { data: null, error: "ドラフトステータスの更新に失敗しました" };
  }

  revalidatePath("/studio/jobs");
  revalidatePath("/admin/review");
  return { data: updatedDraft, error: null };
}

/**
 * 管理者用：本番テーブルのjob_idから最新のdraftを取得
 */
/**
 * 求人draftをIDで取得（管理者用、company_idチェックなし）
 */
export async function getJobDraftById(draftId: string) {
  try {
    const supabase = await createClient();

    console.log("getJobDraftById called with draftId:", draftId);

    const { data: draft, error } = await supabase
      .from("job_postings_draft")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();

    console.log("Supabase query result:", { draft, error });

    if (error) {
      console.error("Get job draft by id error:", error);
      return { data: null, error: error.message };
    }

    if (!draft) {
      console.error("Draft not found for id:", draftId);
      return { data: null, error: "下書きが見つかりません" };
    }

    console.log("Successfully retrieved draft:", draft.id);
    return { data: draft as JobDraftData | null, error: null };
  } catch (error) {
    console.error("Unexpected error in getJobDraftById:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました"
    };
  }
}

export async function getJobDraftByProductionId(productionJobId: string) {
  try {
    const supabase = await createClient();

    console.log("getJobDraftByProductionId called with productionJobId:", productionJobId);

    // production_job_idからdraftを取得
    const { data: draft, error } = await supabase
      .from("job_postings_draft")
      .select("*")
      .eq("production_job_id", productionJobId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    console.log("Supabase query result:", { draft, error });

    if (error) {
      console.error("Get job draft by production id error:", error);
      return { data: null, error: error.message };
    }

    if (!draft) {
      console.error("Draft not found for production_job_id:", productionJobId);
      return { data: null, error: "下書きが見つかりません" };
    }

    console.log("Successfully retrieved draft:", draft.id);
    return { data: draft as JobDraftData | null, error: null };
  } catch (error) {
    console.error("Unexpected error in getJobDraftByProductionId:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました"
    };
  }
}

/**
 * 求人draftのカバー画像をアップロード
 */
export async function uploadJobDraftCoverImage(
  file: File,
  draftId?: string
): Promise<{
  data: string | null;
  error: string | null;
}> {
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
      ? `${profile.company_id}/jobs/draft/${draftId}/${timestamp}.${fileExt}`
      : `${profile.company_id}/jobs/draft/temp/${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload job draft cover image error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error("Upload job draft cover image error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}
