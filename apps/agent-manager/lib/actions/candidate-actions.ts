"use server";

import { createClient } from "@/lib/supabase/server";
import { insertRecord, updateRecord } from "./supabase-actions";
import type {
  Profile,
  ProgressItemWithRelations,
  InterviewNoteWithRelations,
  TablesInsert,
} from "@jobtv-app/shared/types";

type ProgressItem = ProgressItemWithRelations;
type InterviewNote = InterviewNoteWithRelations;

export interface CandidateData extends Partial<TablesInsert<"candidates">> {
  id?: string;
  assigned_to_profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email"> | null;
}

/**
 * 求職者一覧を取得
 */
export async function getCandidates() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select(
      `
      *,
      assigned_to_profile:profiles!candidates_assigned_to_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get candidates error:", error);
    return { data: null, error: error.message };
  }

  return { data: (data as CandidateData[]) || [], error: null };
}

/**
 * 単一の求職者を取得
 */
export async function getCandidate(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("candidates")
    .select(
      `
      *,
      assigned_to_profile:profiles!candidates_assigned_to_fkey(
        id,
        first_name,
        last_name,
        email
      )
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    console.error("Get candidate error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as CandidateData, error: null };
}

/**
 * 求職者の応募履歴を取得
 */
export async function getCandidateApplications(candidateId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      *,
      job_postings (
        title,
        available_statuses,
        companies (
          name
        )
      )
    `,
    )
    .eq("candidate_id", candidateId)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Get candidate applications error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 求職者を作成
 */
export async function createCandidate(data: Omit<CandidateData, "id">) {
  const supabase = await createClient();

  // 既存の求職者を確認
  const { data: existingCandidate } = await supabase
    .from("candidates")
    .select("id, first_name, last_name")
    .eq("email", data.email)
    .single();

  if (existingCandidate) {
    const candidateName = existingCandidate.first_name && existingCandidate.last_name
      ? `${existingCandidate.last_name} ${existingCandidate.first_name}`
      : data.email;
    return {
      data: null,
      error: `このメールアドレス（${data.email}）は既に登録されています。求職者「${candidateName}」を編集してください。`,
    };
  }

  return insertRecord<CandidateData>("candidates", data, ["/admin/candidates"]);
}

/**
 * 求職者を更新
 */
export async function updateCandidate(
  id: string,
  data: Partial<CandidateData>,
) {
  return updateRecord<CandidateData>("candidates", id, data, [
    "/admin/candidates",
  ]);
}

/**
 * 応募を作成
 */
export async function createApplication(
  candidateId: string,
  jobPostingId: string,
) {
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

  // 応募を作成
  const { data: applicationData, error: insertError } = await supabase
    .from("applications")
    .insert([
      {
        candidate_id: candidateId,
        job_posting_id: jobPostingId,
        current_status: "applied",
      },
    ])
    .select()
    .single();

  if (insertError) {
    console.error("Create application error:", insertError);
    return {
      data: null,
      error: insertError.message,
    };
  }

  // 進捗履歴に「応募済み」ステータスを追加
  if (applicationData) {
    const { error: progressError } = await supabase
      .from("application_progress")
      .insert([
        {
          application_id: applicationData.id,
          status: "applied",
          status_date: new Date().toISOString().split("T")[0],
          created_by: user.id,
        },
      ]);

    if (progressError) {
      console.error("Progress insert error:", progressError);
      // 進捗履歴の追加に失敗しても応募は成功しているので、警告のみ
      console.warn(
        "応募は成功しましたが、進捗履歴の追加に失敗しました:",
        progressError.message,
      );
    }
  }

  return { data: applicationData, error: null };
}

/**
 * 求職者の応募詳細と進捗履歴を取得
 */
export async function getCandidateApplicationsDetail(candidateId: string) {
  const supabase = await createClient();

  try {
    // 応募を取得
    const { data: appsData, error: appsError } = await supabase
      .from("applications")
      .select(
        `
        *,
        job_postings (
          id,
          title,
          companies (
            id,
            name
          )
        )
      `,
      )
      .eq("candidate_id", candidateId)
      .order("applied_at", { ascending: false });

    if (appsError || !appsData) {
      return {
        data: null,
        error: appsError?.message || "応募データの取得に失敗しました",
      };
    }

    // 進捗履歴を取得
    const progressItems: ProgressItem[] = [];
    for (const application of appsData) {
      const { data: progressHistory } = await supabase
        .from("application_progress")
        .select("*")
        .eq("application_id", application.id);

      if (progressHistory && progressHistory.length > 0) {
        const userIds = [
          ...new Set([
            ...progressHistory.map((p) => p.created_by).filter(Boolean),
            ...progressHistory.map((p) => p.updated_by).filter(Boolean),
          ]),
        ];

        // プロファイルを取得
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, first_name, last_name, role")
          .in("id", userIds);

        for (const progress of progressHistory) {
          progressItems.push({
            ...progress,
            application: {
              id: application.id,
              job_postings: application.job_postings,
            },
            profiles:
              profiles?.find((p) => p.id === progress.created_by) || null,
            updatedByProfile: progress.updated_by
              ? profiles?.find((p) => p.id === progress.updated_by) || null
              : null,
          });
        }
      }
    }

    // 面談記録を取得
    const { data: notesData, error: notesError } = await supabase
      .from("interview_notes")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("interview_date", { ascending: false });

    let interviewNotes: InterviewNote[] = [];
    if (!notesError && notesData) {
      const noteUserIds = [
        ...new Set([
          ...notesData.map((n) => n.created_by).filter(Boolean),
          ...notesData.map((n) => n.updated_by).filter(Boolean),
          ...notesData.map((n) => n.interviewer_id).filter(Boolean),
        ]),
      ];

      const { data: noteProfiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, role")
        .in("id", noteUserIds);

      interviewNotes = notesData.map((note) => {
        const interviewerProfile = note.interviewer_id
          ? noteProfiles?.find((p) => p.id === note.interviewer_id) || null
          : null;

        return {
          ...note,
          type: "interview_note" as const,
          profiles: noteProfiles?.find((p) => p.id === note.created_by) || null,
          updatedByProfile: note.updated_by
            ? noteProfiles?.find((p) => p.id === note.updated_by) || null
            : null,
          interviewerProfile: interviewerProfile,
        };
      });
    }

    // 進捗履歴をソート
    progressItems.sort((a, b) => {
      const dateA = new Date(a.status_date).getTime();
      const dateB = new Date(b.status_date).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return {
      data: {
        applications: appsData,
        progressItems,
        interviewNotes,
      },
      error: null,
    };
  } catch (error) {
    console.error("Get candidate applications detail error:", error);
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "データ取得に失敗しました",
    };
  }
}

/**
 * 面談記録を取得
 */
export async function getInterviewNotes(candidateId: string) {
  const supabase = await createClient();

  const { data: notesData, error } = await supabase
    .from("interview_notes")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("interview_date", { ascending: false });

  if (error) {
    console.error("Get interview notes error:", error);
    return { data: null, error: error.message };
  }

  if (!notesData || notesData.length === 0) {
    return { data: [], error: null };
  }

  // プロファイルを取得
  const userIds = [
    ...new Set([
      ...notesData.map((n) => n.created_by).filter(Boolean),
      ...notesData.map((n) => n.updated_by).filter(Boolean),
      ...notesData.map((n) => n.interviewer_id).filter(Boolean),
    ]),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .in("id", userIds);

  // プロファイルをマッピング
  const notesWithProfiles = notesData.map((note) => {
    const interviewerProfile = note.interviewer_id
      ? profiles?.find((p) => p.id === note.interviewer_id) || null
      : null;

    return {
      ...note,
      interviewerProfile: interviewerProfile,
      profiles: profiles?.find((p) => p.id === note.created_by) || null,
      updatedByProfile: note.updated_by
        ? profiles?.find((p) => p.id === note.updated_by) || null
        : null,
    };
  });

  return { data: notesWithProfiles || [], error: null };
}
