"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserCompanyId } from "@jobtv-app/shared/actions/company-utils";
import type { TablesInsert } from "@jobtv-app/shared/types";

/**
 * 候補者管理ページ用：自社の求人への応募一覧（候補者情報・メール含む）
 */
export interface ApplicationWithCandidate {
  id: string;
  job_posting_id: string;
  candidate_id: string;
  current_status: string;
  created_at: string;
  job: { id: string; title: string } | null;
  candidates: {
    last_name: string;
    first_name: string;
    profiles: { email: string | null } | null;
  } | null;
}

/**
 * 企業が自社の求人への応募一覧を取得（候補者管理で説明会予約と合わせて表示する用）
 */
export async function getCompanyApplications(limit: number = 100) {
  const supabase = await createClient();

  const { companyId, error: companyError } = await getUserCompanyId();
  if (companyError) return { data: null, error: companyError };
  if (!companyId) return { data: [], error: null };

  const { data: jobs, error: jobsError } = await supabase
    .from("job_postings")
    .select("id, title")
    .eq("company_id", companyId);

  if (jobsError) {
    console.error("Get job postings error:", jobsError);
    return { data: null, error: jobsError.message };
  }
  if (!jobs || jobs.length === 0) return { data: [], error: null };

  const jobIds = jobs.map((j) => j.id);

  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select("id, job_posting_id, candidate_id, current_status, created_at")
    .in("job_posting_id", jobIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (applicationsError) {
    console.error("Get company applications error:", applicationsError);
    return { data: null, error: applicationsError.message };
  }
  if (!applications || applications.length === 0) return { data: [], error: null };

  const candidateIds = [...new Set(applications.map((a) => a.candidate_id))];
  const { data: candidatesRows, error: candidatesError } = await supabase
    .from("candidates")
    .select("id, last_name, first_name, profiles!profiles_candidate_id_fkey (email)")
    .in("id", candidateIds);

  if (candidatesError) {
    console.error("Get candidates for applications error:", candidatesError);
    return { data: null, error: candidatesError.message };
  }

  const candidateMap = new Map<
    string,
    { last_name: string; first_name: string; profiles: { email: string | null } | null }
  >();
  (candidatesRows ?? []).forEach((c: Record<string, unknown>) => {
    candidateMap.set(c.id as string, {
      last_name: (c.last_name as string) ?? "",
      first_name: (c.first_name as string) ?? "",
      profiles: c.profiles ? { email: (c.profiles as { email: string | null }).email } : null
    });
  });

  const jobMap = new Map(jobs.map((j) => [j.id, j]));

  const list: ApplicationWithCandidate[] = applications.map((app) => ({
    id: app.id,
    job_posting_id: app.job_posting_id,
    candidate_id: app.candidate_id,
    current_status: app.current_status,
    created_at: app.created_at,
    job: jobMap.get(app.job_posting_id) ?? null,
    candidates: candidateMap.get(app.candidate_id) ?? null
  }));

  return { data: list, error: null };
}

/**
 * 学生（candidate）が選択した求人にエントリーする。
 * 公開中（status = 'active'）の求人のみ対象。既にエントリー済みはスキップし、created / alreadyApplied で返す。
 */
export async function createApplicationsForCandidate(jobPostingIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("candidate_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.error("Get profile error:", profileError);
    return { data: null, error: "プロフィールを取得できませんでした" };
  }

  if (profile.role !== "candidate" || !profile.candidate_id) {
    return { data: null, error: "求職者アカウントでログインしてください" };
  }

  const candidateId = profile.candidate_id;

  if (jobPostingIds.length === 0) {
    return { data: null, error: "エントリーする求人を選択してください" };
  }

  // 公開中の求人のみに限定
  const { data: activeJobs, error: jobsError } = await supabase
    .from("job_postings")
    .select("id")
    .eq("status", "active")
    .in("id", jobPostingIds);

  if (jobsError) {
    console.error("Get job postings error:", jobsError);
    return { data: null, error: "求人情報の取得に失敗しました" };
  }

  const validIds = (activeJobs ?? []).map((j) => j.id);
  if (validIds.length === 0) {
    return { data: null, error: "対象の求人が見つからないか、募集は終了しています" };
  }

  const created: string[] = [];
  const alreadyApplied: string[] = [];

  for (const jobPostingId of validIds) {
    const insert: TablesInsert<"applications"> = {
      candidate_id: candidateId,
      job_posting_id: jobPostingId,
      current_status: "applied"
    };

    const { error: insertError } = await supabase.from("applications").insert(insert).select("id").single();

    if (insertError) {
      if (insertError.code === "23505") {
        // unique_violation (candidate_id, job_posting_id)
        alreadyApplied.push(jobPostingId);
      } else {
        console.error("Insert application error:", insertError);
        return { data: null, error: "エントリーの登録に失敗しました" };
      }
    } else {
      created.push(jobPostingId);
    }
  }

  revalidatePath("/", "layout");
  return {
    data: { created, alreadyApplied },
    error: null
  };
}

/**
 * ログイン中の学生が指定した求人IDのうち、既にエントリー済みのID一覧を返す。
 * 未ログイン・非 candidate の場合は空配列を返す。
 */
export async function getAppliedJobIdsForCurrentCandidate(jobIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) {
    return { data: [], error: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("candidate_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.candidate_id || profile.role !== "candidate") {
    return { data: [], error: null };
  }

  if (jobIds.length === 0) {
    return { data: [], error: null };
  }

  const { data: rows, error } = await supabase
    .from("applications")
    .select("job_posting_id")
    .eq("candidate_id", profile.candidate_id)
    .in("job_posting_id", jobIds);

  if (error) {
    console.error("getAppliedJobIdsForCurrentCandidate error:", error);
    return { data: [], error: null };
  }

  const applied = (rows ?? []).map((r) => r.job_posting_id).filter(Boolean);
  return { data: applied, error: null };
}

/**
 * ログイン中の学生が指定した求人にエントリー済みかどうか。
 * 未ログイン・非 candidate の場合は false。
 */
export async function getHasAppliedToJob(jobId: string) {
  const { data: appliedIds } = await getAppliedJobIdsForCurrentCandidate([jobId]);
  return { data: appliedIds.length > 0, error: null };
}
