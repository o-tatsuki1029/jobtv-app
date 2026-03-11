"use server";

import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@jobtv-app/shared/supabase/admin";
import { logAudit } from "@jobtv-app/shared/utils/audit";
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
  /** 管理メモ（candidate_management テーブルから JOIN）*/
  notes?: string | null;
  /** 担当リクルーター（candidate_management テーブルから JOIN）*/
  assigned_to?: string | null;
  assigned_to_profile?: Pick<Profile, "id" | "first_name" | "last_name" | "email"> | null;
  /** メールと名前は profiles にのみ保持。取得時に join して渡す */
  profiles?: { email: string | null; last_name: string | null; first_name: string | null; last_name_kana: string | null; first_name_kana: string | null } | null;
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
      candidate_management(
        notes,
        assigned_to,
        assigned_to_profile:profiles!candidate_management_assigned_to_fkey(id, first_name, last_name, email)
      ),
      profiles:profiles!profiles_candidate_id_fkey(email, last_name, first_name, last_name_kana, first_name_kana)
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getCandidates", err: error }, "求職者一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }

  const flattenedData = (data || []).map((c) => {
    const mgmt = Array.isArray(c.candidate_management) ? c.candidate_management[0] : c.candidate_management;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { candidate_management: _cm, ...rest } = c;
    return {
      ...rest,
      notes: (mgmt as { notes?: string | null } | null)?.notes ?? null,
      assigned_to: (mgmt as { assigned_to?: string | null } | null)?.assigned_to ?? null,
      assigned_to_profile: (mgmt as { assigned_to_profile?: unknown } | null)?.assigned_to_profile ?? null,
    } as CandidateData;
  });

  return { data: flattenedData, error: null };
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
      candidate_management(
        notes,
        assigned_to,
        assigned_to_profile:profiles!candidate_management_assigned_to_fkey(id, first_name, last_name, email)
      ),
      profiles:profiles!profiles_candidate_id_fkey(email, last_name, first_name, last_name_kana, first_name_kana)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    logger.error({ action: "getCandidate", err: error, candidateId: id }, "求職者の取得に失敗しました");
    return { data: null, error: error.message };
  }

  const mgmt = Array.isArray(data.candidate_management) ? data.candidate_management[0] : data.candidate_management;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { candidate_management: _cm, ...rest } = data;
  const flatData: CandidateData = {
    ...rest,
    notes: (mgmt as { notes?: string | null } | null)?.notes ?? null,
    assigned_to: (mgmt as { assigned_to?: string | null } | null)?.assigned_to ?? null,
    assigned_to_profile: (mgmt as { assigned_to_profile?: unknown } | null)?.assigned_to_profile as CandidateData["assigned_to_profile"] ?? null,
  };

  return { data: flatData, error: null };
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
    logger.error({ action: "getCandidateApplications", err: error, candidateId }, "求職者の応募履歴の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 求職者を作成（auth ユーザー + profiles + candidates を一括作成）
 * すべての候補者は auth ユーザーを持つ必要がある
 */
export async function createCandidate(data: Omit<CandidateData, "id"> & { email?: string }) {
  const email = data.email;
  if (!email) {
    return { data: null, error: "メールアドレスは必須です" };
  }

  const adminSupabase = createAdminClient();

  // 1. 既存の求職者を確認（メールは profiles で検索）
  const { data: profileByEmail } = await adminSupabase
    .from("profiles")
    .select("candidate_id, first_name, last_name")
    .eq("email", email)
    .not("candidate_id", "is", null)
    .maybeSingle();

  if (profileByEmail?.candidate_id) {
    const candidateName =
      profileByEmail.first_name && profileByEmail.last_name
        ? `${profileByEmail.last_name} ${profileByEmail.first_name}`
        : email;
    return {
      data: null,
      error: `このメールアドレス（${email}）は既に登録されています。求職者「${candidateName}」を編集してください。`,
    };
  }

  // 2. auth ユーザーを作成
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    logger.error({ action: "createCandidate", err: authError }, "認証ユーザーの作成に失敗しました");
    return { data: null, error: `ユーザー作成に失敗しました: ${authError?.message ?? "不明なエラー"}` };
  }

  const userId = authData.user.id;

  // 3. profiles 待機（handle_new_user トリガーで自動作成されるのを待つ）
  let profileExists = false;
  for (let i = 0; i < 30; i++) {
    const { data: existingProfile } = await adminSupabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();
    if (existingProfile) {
      profileExists = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 4. profiles を更新（名前・ロール設定）
  const profileData = {
    id: userId,
    email,
    role: "candidate" as const,
    last_name: data.last_name ?? null,
    first_name: data.first_name ?? null,
    last_name_kana: data.last_name_kana ?? null,
    first_name_kana: data.first_name_kana ?? null,
    updated_at: new Date().toISOString(),
  };

  if (profileExists) {
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update(profileData)
      .eq("id", userId);
    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(userId);
      return { data: null, error: `プロフィール更新に失敗しました: ${profileError.message}` };
    }
  } else {
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .upsert(profileData, { onConflict: "id" });
    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(userId);
      return { data: null, error: `プロフィール作成に失敗しました: ${profileError.message}` };
    }
  }

  // 5. candidates に INSERT（名前・管理フィールド以外）
  const { email: _email, last_name: _ln, first_name: _fn, last_name_kana: _lnk, first_name_kana: _fnk, profiles: _p, assigned_to_profile: _ap, notes: mgmtNotes, assigned_to: mgmtAssignedTo, ...candidateFields } = data as CandidateData & { email?: string };

  const { data: newCandidate, error: candidateError } = await adminSupabase
    .from("candidates")
    .insert(candidateFields)
    .select("id")
    .single();

  if (candidateError || !newCandidate) {
    await adminSupabase.auth.admin.deleteUser(userId);
    return { data: null, error: `候補者作成に失敗しました: ${candidateError?.message ?? "不明なエラー"}` };
  }

  // 6. profiles.candidate_id を設定
  const { error: linkError } = await adminSupabase
    .from("profiles")
    .update({ candidate_id: newCandidate.id })
    .eq("id", userId);

  if (linkError) {
    logger.error({ action: "createCandidate", err: linkError, candidateId: newCandidate.id }, "candidate_id のリンクに失敗しました（非致命的）");
  }

  // 7. candidate_management に INSERT（notes / assigned_to がある場合のみ）
  if (mgmtNotes != null || mgmtAssignedTo != null) {
    const { error: mgmtError } = await adminSupabase
      .from("candidate_management")
      .insert({ candidate_id: newCandidate.id, notes: mgmtNotes ?? null, assigned_to: mgmtAssignedTo ?? null });
    if (mgmtError) {
      logger.error({ action: "createCandidate", err: mgmtError, candidateId: newCandidate.id }, "candidate_management の作成に失敗しました（非致命的）");
    }
  }

  const supabaseForUser = await createClient();
  const { data: { user: currentUser } } = await supabaseForUser.auth.getUser();

  if (currentUser) {
    logAudit({
      userId: currentUser.id,
      action: "candidate.create",
      category: "account",
      resourceType: "candidates",
      resourceId: newCandidate.id,
      app: "agent-manager",
      metadata: { candidateName: [data.last_name, data.first_name].filter(Boolean).join(" ") || email },
    });
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/candidates");

  return { data: newCandidate, error: null };
}

/**
 * 求職者を更新（email・名前は profiles に保存、その他は candidates に保存）
 */
export async function updateCandidate(
  id: string,
  data: Partial<CandidateData> & { email?: string },
) {
  const { email, last_name, first_name, last_name_kana, first_name_kana, ...rest } = data;

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  // profiles に email と名前を更新
  const profileUpdate: Record<string, string | null> = {};
  if (email !== undefined) profileUpdate.email = email;
  if (last_name !== undefined) profileUpdate.last_name = last_name ?? null;
  if (first_name !== undefined) profileUpdate.first_name = first_name ?? null;
  if (last_name_kana !== undefined) profileUpdate.last_name_kana = last_name_kana ?? null;
  if (first_name_kana !== undefined) profileUpdate.first_name_kana = first_name_kana ?? null;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update(profileUpdate)
      .eq("candidate_id", id);

    if (profileError) {
      logger.error({ action: "updateCandidate", err: profileError, candidateId: id }, "プロフィールの更新に失敗しました");
      return { data: null, error: profileError.message };
    }
  }

  // candidates のフィールドを更新（名前・管理フィールド以外）
  // profiles / assigned_to_profile / notes / assigned_to（candidate_management へ）を除外
  const { profiles: _p, assigned_to_profile: _ap, notes, assigned_to, ...candidateFields } = rest;

  if (Object.keys(candidateFields).length > 0) {
    const { data: updatedData, error: updateError } = await updateRecord<CandidateData>("candidates", id, candidateFields, []);
    if (updateError) return { data: null, error: updateError };
    void updatedData;
  }

  // candidate_management を UPSERT（notes / assigned_to のいずれかが指定されていれば）
  if ("notes" in rest || "assigned_to" in rest) {
    const mgmtFields: Record<string, unknown> = { candidate_id: id };
    if ("notes" in rest) mgmtFields.notes = notes ?? null;
    if ("assigned_to" in rest) mgmtFields.assigned_to = assigned_to ?? null;
    const { error: mgmtError } = await supabase
      .from("candidate_management")
      .upsert(mgmtFields, { onConflict: "candidate_id" });
    if (mgmtError) {
      logger.error({ action: "updateCandidate", err: mgmtError, candidateId: id }, "candidate_management の更新に失敗しました");
      return { data: null, error: mgmtError.message };
    }
  }

  if (currentUser) {
    logAudit({
      userId: currentUser.id,
      action: "candidate.update",
      category: "account",
      resourceType: "candidates",
      resourceId: id,
      app: "agent-manager",
      metadata: { candidateId: id },
    });
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/admin/candidates");
  return { data: null, error: null };
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
    logger.error({ action: "createApplication", err: insertError, candidateId, jobPostingId }, "応募の作成に失敗しました");
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
      logger.error({ action: "createApplication", err: progressError, applicationId: applicationData.id }, "進捗履歴の追加に失敗しました");
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
    logger.error({ action: "getCandidateApplicationsDetail", err: error, candidateId }, "求職者の応募詳細の取得に失敗しました");
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
    logger.error({ action: "getInterviewNotes", err: error, candidateId }, "面談記録の取得に失敗しました");
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
