"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

export type JobData = Partial<TablesInsert<"job_postings">> & { id?: string };
export type JobDraftData = Partial<TablesInsert<"job_postings_draft">> & { id?: string };

/**
 * 求人の公開/非公開を切り替え
 */
export async function toggleJobStatus(productionJobId: string, newStatus: "active" | "closed") {
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

  // 本番レコードが自分の企業のものか確認
  const { data: productionJob, error: jobError } = await supabase
    .from("job_postings")
    .select("company_id, status")
    .eq("id", productionJobId)
    .single();

  if (jobError || !productionJob) {
    return { data: null, error: "求人が見つかりません" };
  }

  if (productionJob.company_id !== profile.company_id) {
    return { data: null, error: "権限がありません" };
  }

  // 本番テーブルのstatusを変更
  const { data, error } = await supabase
    .from("job_postings")
    .update({ status: newStatus })
    .eq("id", productionJobId)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Toggle job status error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/jobs");
  revalidatePath(`/job/${productionJobId}`);
  return { data, error: null };
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
    .from("job_postings_draft")
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

  // submitted、approved、rejectedの場合はdraftに戻す（編集可能にする）
  const updateData: TablesUpdate<"job_postings_draft"> = {
    ...data,
    updated_at: new Date().toISOString()
  } as TablesUpdate<"job_postings_draft">;

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
    .select("*, companies!company_id(name, logo_url)")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (draftByIdError || !draftById) {
    // IDで見つからない場合、最新のdraftを取得
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("job_postings_draft")
      .select("*, companies!company_id(name, logo_url)")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "submitted", "approved", "rejected"])
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

    // production_job_idがある場合、本番テーブルからstatusを取得（トグルボタン用）
    if (latestDraft.production_job_id) {
      const { data: productionJob } = await supabase
        .from("job_postings")
        .select("status")
        .eq("id", latestDraft.production_job_id)
        .maybeSingle();

      if (productionJob) {
        (latestDraft as any).production_status = productionJob.status;
      }
    }

    return { data: latestDraft as JobDraftData, error: null };
  }

  // production_job_idがある場合、本番テーブルからstatusを取得（トグルボタン用）
  if (draftById.production_job_id) {
    const { data: productionJob } = await supabase
      .from("job_postings")
      .select("status")
      .eq("id", draftById.production_job_id)
      .maybeSingle();

    if (productionJob) {
      (draftById as any).production_status = productionJob.status;
    }
  }

  return { data: draftById as JobDraftData, error: null };
}

/**
 * 求人draft一覧を取得（ログインユーザーの企業のdraftのみ）
 * 本番テーブルのdisplay_orderでソート
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

  // ドラフト一覧を取得
  const { data: drafts, error } = await supabase
    .from("job_postings_draft")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get job drafts error:", error);
    return { data: null, error: error.message };
  }

  if (!drafts || drafts.length === 0) {
    return { data: [], error: null };
  }

  // 本番IDを持つドラフトの本番テーブルからdisplay_orderを取得
  const productionIds = drafts
    .filter((d) => d.production_job_id)
    .map((d) => d.production_job_id!);

  let productionDisplayOrders: Record<string, number | null> = {};
  if (productionIds.length > 0) {
    const { data: productions } = await supabase
      .from("job_postings")
      .select("id, display_order")
      .in("id", productionIds);

    if (productions) {
      for (const p of productions) {
        productionDisplayOrders[p.id] = p.display_order;
      }
    }
  }

  // ドラフトに本番のdisplay_orderをマージしてソート
  const draftsWithOrder = drafts.map((draft) => ({
    ...draft,
    display_order: draft.production_job_id
      ? productionDisplayOrders[draft.production_job_id] ?? null
      : null
  }));

  // display_orderでソート（nullは後ろ）
  draftsWithOrder.sort((a, b) => {
    if (a.display_order === null && b.display_order === null) {
      // 両方nullの場合はcreated_atの降順
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (a.display_order === null) return 1;
    if (b.display_order === null) return -1;
    return a.display_order - b.display_order;
  });

  return { data: draftsWithOrder, error: null };
}

/**
 * 求人draftを審査申請（本番テーブルにコピー）
 */
export async function submitJobForReview(draftId: string, keepProductionActive: boolean = true) {
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

  const { data: updatedDraft, error: updateError } = await supabase
    .from("job_postings_draft")
    .update(updateData)
    .eq("id", draftId)
    .select()
    .single();

  if (updateError) {
    console.error("Update draft status error:", updateError);
    return { data: null, error: updateError.message };
  }

  // 更新後の状態を確認
  if (updatedDraft?.draft_status !== "submitted") {
    return { data: null, error: "ドラフトステータスの更新に失敗しました" };
  }

  // 審査申請時に本番求人を非公開にする場合
  if (!keepProductionActive && draft.production_job_id) {
    const { error: productionUpdateError } = await supabase
      .from("job_postings")
      .update({ status: "closed" })
      .eq("id", draft.production_job_id);

    if (productionUpdateError) {
      console.error("Failed to close production job:", productionUpdateError);
      // エラーが発生しても審査申請は成功とみなす
    }
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

    const { data: draft, error } = await supabase
      .from("job_postings_draft")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();

    if (error) {
      console.error("Get job draft by id error:", error);
      return { data: null, error: error.message };
    }

    if (!draft) {
      return { data: null, error: "下書きが見つかりません" };
    }
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

    // production_job_idからdraftを取得
    const { data: draft, error } = await supabase
      .from("job_postings_draft")
      .select("*")
      .eq("production_job_id", productionJobId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Get job draft by production id error:", error);
      return { data: null, error: error.message };
    }

    if (!draft) {
      return { data: null, error: "下書きが見つかりません" };
    }
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
 * 求人の表示順序を更新（本番テーブル）
 * ドラフトIDから本番IDを取得して、本番テーブルの表示順序を更新
 */
export async function reorderJobs(orders: Array<{ id: string; display_order: number }>) {
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

  try {
    // ドラフトIDから本番IDを取得
    const draftIds = orders.map((o) => o.id);
    const { data: drafts, error: draftsError } = await supabase
      .from("job_postings_draft")
      .select("id, production_job_id")
      .in("id", draftIds)
      .eq("company_id", profile.company_id);

    if (draftsError) {
      console.error("Get job drafts error:", draftsError);
      return { data: null, error: draftsError.message };
    }

    // ドラフトIDと本番IDのマッピングを作成
    const draftToProduction = new Map<string, string>();
    for (const draft of drafts || []) {
      if (draft.production_job_id) {
        draftToProduction.set(draft.id, draft.production_job_id);
      }
    }

    // 本番テーブルの表示順序を更新
    for (const order of orders) {
      const productionId = draftToProduction.get(order.id);
      if (productionId) {
        const { error } = await supabase
          .from("job_postings")
          .update({ display_order: order.display_order })
          .eq("id", productionId)
          .eq("company_id", profile.company_id);

        if (error) {
          console.error("Reorder jobs error:", error);
          return { data: null, error: error.message };
        }
      }
    }

    revalidatePath("/studio/jobs");
    return { data: true, error: null };
  } catch (error) {
    console.error("Reorder jobs error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "並び替えに失敗しました"
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

