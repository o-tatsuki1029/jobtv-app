"use server";

import { createClient } from "@/lib/supabase/server";
import { insertRecord, updateRecord } from "./supabase-actions";
import type { TablesInsert } from "@jobtv-app/shared/types";

export type JobData = Partial<TablesInsert<"job_postings">> & { id?: string };

/**
 * 求人を作成
 */
export async function createJob(data: Omit<JobData, "id">) {
  const supabase = await createClient();

  // 現在のユーザーIDを取得
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: "ログインが必要です",
    };
  }

  const jobData = {
    ...data,
    created_by: user.id,
  };

  return insertRecord<JobData>("job_postings", jobData, ["/admin/jobs"]);
}

/**
 * 求人を更新
 */
export async function updateJob(id: string, data: Partial<JobData>) {
  return updateRecord<JobData>("job_postings", id, data, ["/admin/jobs"]);
}

/**
 * 求人一覧を取得
 */
export async function getJobs() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select(
      `
      *,
      companies (
        id,
        name
      )
    `
    )
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

  const { data, error } = await supabase
    .from("job_postings")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Get job error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as JobData, error: null };
}

/**
 * 求人の応募一覧を取得
 */
export async function getJobApplications(jobId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      *,
      candidates (
        id,
        last_name,
        first_name,
        last_name_kana,
        first_name_kana
      )
    `
    )
    .eq("job_posting_id", jobId)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Get job applications error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 求人情報と利用可能ステータスを取得
 */
export async function getJobWithStatuses(jobId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select("id, title, available_statuses")
    .eq("id", jobId)
    .single();

  if (error) {
    console.error("Get job with statuses error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 企業のアクティブな求人一覧を取得
 */
export async function getCompanyActiveJobs(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select("id, title, company_id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("title");

  if (error) {
    console.error("Get company active jobs error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 複数の求人の応募一覧を取得
 */
export async function getMultipleJobApplications(jobIds: string[]) {
  const supabase = await createClient();

  if (jobIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      *,
      candidates (
        id,
        last_name,
        first_name,
        last_name_kana,
        first_name_kana
      ),
      job_postings (
        id,
        title,
        available_statuses
      )
    `
    )
    .in("job_posting_id", jobIds)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Get multiple job applications error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 求人のステータスを更新（審査承認・却下）
 */
export async function updateJobStatus(id: string, status: "active" | "closed" | "pending") {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_postings")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update job status error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 求人を承認（pending → active）
 */
export async function approveJob(id: string) {
  return updateJobStatus(id, "active");
}

/**
 * 求人を却下（pending → closed）
 */
export async function rejectJob(id: string) {
  return updateJobStatus(id, "closed");
}
