"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * ログイン中の候補者プロフィール（candidates + email）を取得
 */
export async function getMyCandidateProfile() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "ログインが必要です" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("candidate_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.candidate_id || profile.role !== "candidate") {
    return { data: null, error: "候補者プロフィールを取得できませんでした" };
  }

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select(
      `id, last_name, first_name, last_name_kana, first_name_kana,
       gender, date_of_birth, phone,
       school_type, school_name, school_kcode, faculty_name, department_name, major_field, graduation_year,
       desired_work_location, desired_industry, desired_job_type`
    )
    .eq("id", profile.candidate_id)
    .single();

  if (candidateError || !candidate) {
    return { data: null, error: "候補者情報を取得できませんでした" };
  }

  return {
    data: {
      ...candidate,
      email: user.email ?? null
    },
    error: null
  };
}

export interface UpdateCandidateProfileData {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  school_type: string | null;
  school_name: string | null;
  school_kcode: string | null;
  faculty_name: string | null;
  department_name: string | null;
  major_field: string | null;
  graduation_year: number | null;
  desired_work_location: string | null;
  desired_industry: string[];
  desired_job_type: string[];
}

/**
 * ログイン中の候補者プロフィールを更新（RLS: 本人のみ）
 */
export async function updateMyCandidateProfile(data: UpdateCandidateProfileData) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("candidate_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.candidate_id || profile.role !== "candidate") {
    return { error: "候補者プロフィールを取得できませんでした" };
  }

  const { error: updateError } = await supabase
    .from("candidates")
    .update({
      last_name: data.last_name,
      first_name: data.first_name,
      last_name_kana: data.last_name_kana,
      first_name_kana: data.first_name_kana,
      phone: data.phone || null,
      gender: data.gender || null,
      date_of_birth: data.date_of_birth || null,
      school_type: data.school_type || null,
      school_name: data.school_name || null,
      school_kcode: data.school_kcode || null,
      faculty_name: data.faculty_name || null,
      department_name: data.department_name || null,
      major_field: data.major_field || null,
      graduation_year: data.graduation_year || null,
      desired_work_location: data.desired_work_location || null,
      desired_industry: data.desired_industry,
      desired_job_type: data.desired_job_type,
      updated_at: new Date().toISOString()
    })
    .eq("id", profile.candidate_id);

  if (updateError) {
    console.error("Update candidate profile error:", updateError);
    return { error: "プロフィールの更新に失敗しました" };
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  return { error: null };
}

/**
 * ログイン中の候補者のエントリー一覧を取得（求人・企業情報含む）
 */
export async function getMyApplications({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "ログインが必要です" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("candidate_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.candidate_id || profile.role !== "candidate") {
    return { data: null, error: "候補者プロフィールを取得できませんでした" };
  }

  const { data, error } = await supabase
    .from("applications")
    .select(
      `id, job_posting_id, current_status, created_at,
       job_postings (id, title, graduation_year, companies (id, name, logo_url))`
    )
    .eq("candidate_id", profile.candidate_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Get my applications error:", error);
    return { data: null, error: "エントリー一覧の取得に失敗しました" };
  }

  return { data, error: null };
}

/**
 * ログイン中の候補者の説明会予約一覧を取得（日程・説明会情報含む）
 */
export async function getMyReservations() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "ログインが必要です" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("candidate_id, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.candidate_id || profile.role !== "candidate") {
    return { data: null, error: "候補者プロフィールを取得できませんでした" };
  }

  const { data, error } = await supabase
    .from("session_reservations")
    .select(
      `id, status, attended, created_at,
       session_dates (id, event_date, start_time, end_time,
         sessions (id, title, companies (id, name)))`
    )
    .eq("candidate_id", profile.candidate_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get my reservations error:", error);
    return { data: null, error: "予約一覧の取得に失敗しました" };
  }

  return { data, error: null };
}
