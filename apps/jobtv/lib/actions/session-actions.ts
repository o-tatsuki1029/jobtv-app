"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

export type SessionData = Partial<TablesInsert<"sessions">> & { id?: string };
export type SessionDraftData = Partial<TablesInsert<"sessions_draft">> & { id?: string };

/**
 * 説明会一覧を取得
 */
export async function getSessions() {
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
    .from("sessions")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get sessions error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 説明会を取得
 */
export async function getSession(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).single();

  if (error) {
    console.error("Get session error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 説明会を作成
 */
export async function createSession(data: Omit<SessionData, "id" | "created_by">) {
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

  const sessionData: TablesInsert<"sessions"> = {
    ...data,
    company_id: profile.company_id,
    created_by: user.id,
    // 新規作成時は常にpending（審査中）ステータス
    status: "pending" as const
  } as TablesInsert<"sessions">;

  const { data: result, error } = await supabase.from("sessions").insert(sessionData).select().single();

  if (error) {
    console.error("Create session error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { data: result, error: null };
}

/**
 * 説明会を更新
 */
export async function updateSession(id: string, data: Partial<Omit<SessionData, "id" | "created_by" | "company_id" | "status">>) {
  const supabase = await createClient();

  // statusは企業管理画面から変更不可（管理者のみ変更可能）
  const { status, ...updateDataWithoutStatus } = data;

  const updateData: TablesUpdate<"sessions"> = {
    ...updateDataWithoutStatus,
    updated_at: new Date().toISOString()
  } as TablesUpdate<"sessions">;

  const { data: result, error } = await supabase.from("sessions").update(updateData).eq("id", id).select().single();

  if (error) {
    console.error("Update session error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { data: result, error: null };
}

/**
 * 説明会を削除
 */
export async function deleteSession(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("sessions").delete().eq("id", id);

  if (error) {
    console.error("Delete session error:", error);
    return { error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { error: null };
}

/**
 * 説明会のカバー画像をアップロード
 */
export async function uploadSessionCoverImage(sessionId: string | null, file: File) {
  try {
    const supabase = await createClient();

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

    // ファイル名を生成（companyId/sessions/sessionId-or-temp/timestamp-originalname）
    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop();
    const fileName = sessionId
      ? `${profile.company_id}/sessions/${sessionId}/${timestamp}.${fileExt}`
      : `${profile.company_id}/sessions/temp/${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload session cover image error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error("Upload session cover image error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}

/**
 * 複数の説明会の予約数を一括取得
 */
export async function getSessionReservationCounts(sessionIds: string[]) {
  const supabase = await createClient();

  if (sessionIds.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase
    .from("session_reservations")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("status", "reserved");

  if (error) {
    console.error("Get session reservation counts error:", error);
    return { data: null, error: error.message };
  }

  // 各説明会IDごとに予約数をカウント
  const counts: Record<string, number> = {};
  sessionIds.forEach((id) => {
    counts[id] = 0;
  });
  data?.forEach((reservation) => {
    if (reservation.session_id) {
      counts[reservation.session_id] = (counts[reservation.session_id] || 0) + 1;
    }
  });

  return { data: counts, error: null };
}

/**
 * 説明会の日程一覧を取得
 */
export async function getSessionDates(sessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_dates")
    .select("*")
    .eq("session_id", sessionId)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Get session dates error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 説明会の日程を保存（一括更新）
 */
export async function saveSessionDates(sessionId: string, dates: Array<{ event_date: string; start_time: string; end_time: string; capacity?: number | null }>) {
  const supabase = await createClient();

  try {
    // 既存の日程を削除
    const { error: deleteError } = await supabase.from("session_dates").delete().eq("session_id", sessionId);

    if (deleteError) {
      console.error("Delete session dates error:", deleteError);
      return { data: null, error: deleteError.message };
    }

    // 新しい日程を追加
    if (dates.length > 0) {
      const datesToInsert = dates.map((date) => ({
        session_id: sessionId,
        event_date: date.event_date,
        start_time: date.start_time,
        end_time: date.end_time,
        capacity: date.capacity || null
      }));

      const { data: insertedDates, error: insertError } = await supabase
        .from("session_dates")
        .insert(datesToInsert)
        .select();

      if (insertError) {
        console.error("Insert session dates error:", insertError);
        return { data: null, error: insertError.message };
      }

      return { data: insertedDates, error: null };
    }

    return { data: [], error: null };
  } catch (error) {
    console.error("Save session dates error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "日程の保存に失敗しました"
    };
  }
}

/**
 * 説明会draftを作成
 */
export async function createSessionDraft(
  data: Omit<
    SessionDraftData,
    "id" | "created_by" | "draft_status" | "submitted_at" | "approved_at" | "rejected_at" | "production_session_id"
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

  const draftData: TablesInsert<"sessions_draft"> = {
    ...data,
    company_id: profile.company_id,
    created_by: user.id,
    draft_status: "draft"
  } as TablesInsert<"sessions_draft">;

  const { data: result, error } = await supabase.from("sessions_draft").insert(draftData).select().single();

  if (error) {
    console.error("Create session draft error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { data: result, error: null };
}

/**
 * 説明会draftを更新
 */
export async function updateSessionDraft(
  id: string,
  data: Partial<
    Omit<
      SessionDraftData,
      | "id"
      | "created_by"
      | "company_id"
      | "draft_status"
      | "submitted_at"
      | "approved_at"
      | "rejected_at"
      | "production_session_id"
    >
  >
) {
  const supabase = await createClient();

  // 現在のdraftを取得して、draft_statusを確認
  const { data: currentDraft, error: fetchError } = await supabase
    .from("sessions_draft")
    .select("draft_status")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Get session draft error:", fetchError);
    return { data: null, error: fetchError.message };
  }

  // submittedまたはapprovedの場合はdraftに戻す（編集可能にする）
  const updateData: TablesUpdate<"sessions_draft"> = {
    ...data,
    updated_at: new Date().toISOString()
  } as TablesUpdate<"sessions_draft">;

  if (currentDraft?.draft_status === "submitted" || currentDraft?.draft_status === "approved") {
    (updateData as any).draft_status = "draft";
    (updateData as any).submitted_at = null;
    (updateData as any).approved_at = null;
  }

  const { data: result, error } = await supabase
    .from("sessions_draft")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Update session draft error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { data: result, error: null };
}

/**
 * 説明会draftを取得（最新のdraftまたはrejectedを取得）
 */
export async function getSessionDraft(id: string) {
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
    .from("sessions_draft")
    .select("*")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (draftByIdError || !draftById) {
    // IDで見つからない場合、最新のdraftまたはrejectedを取得
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("sessions_draft")
      .select("*")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      console.error("Get session draft error:", latestDraftError);
      return { data: null, error: latestDraftError.message };
    }

    if (!latestDraft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    return { data: latestDraft as SessionDraftData, error: null };
  }

  // 取得したdraftがsubmittedまたはapprovedの場合、最新のdraftまたはrejectedを取得
  if (draftById.draft_status === "submitted" || draftById.draft_status === "approved") {
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("sessions_draft")
      .select("*")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      console.error("Get session draft error:", latestDraftError);
      return { data: null, error: latestDraftError.message };
    }

    if (latestDraft) {
      return { data: latestDraft as SessionDraftData, error: null };
    }
  }

  return { data: draftById as SessionDraftData, error: null };
}

/**
 * 説明会draft一覧を取得（ログインユーザーの企業のdraftのみ）
 */
export async function getSessionDrafts() {
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
    .from("sessions_draft")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get session drafts error:", error);
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 説明会draftを審査申請（本番テーブルにコピー）
 */
export async function submitSessionForReview(draftId: string) {
  const supabase = await createClient();

  // draftを取得
  const { data: draft, error: draftError } = await supabase
    .from("sessions_draft")
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
  const updateData: any = {
    draft_status: "submitted",
    submitted_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from("sessions_draft")
    .update(updateData)
    .eq("id", draftId);

  if (updateError) {
    console.error("Update draft status error:", updateError);
    return { data: null, error: updateError.message };
  }

  revalidatePath("/studio/sessions");
  revalidatePath("/admin/review");
  return { data: draft, error: null };
}

/**
 * 説明会draftのカバー画像をアップロード
 */
export async function uploadSessionDraftCoverImage(
  file: File,
  draftId?: string
): Promise<{
  data: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

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
      ? `${profile.company_id}/sessions/draft/${draftId}/${timestamp}.${fileExt}`
      : `${profile.company_id}/sessions/draft/temp/${timestamp}.${fileExt}`;

    // ファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false
      });

    if (uploadError) {
      console.error("Upload session draft cover image error:", uploadError);
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    console.error("Upload session draft cover image error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "ファイルのアップロードに失敗しました"
    };
  }
}

/**
 * 管理者用：本番テーブルのsession_idから最新のdraftを取得
 */
/**
 * 説明会draftをIDで取得（管理者用、company_idチェックなし）
 */
export async function getSessionDraftById(draftId: string) {
  try {
    const supabase = await createClient();

    console.log("getSessionDraftById called with draftId:", draftId);

    const { data: draft, error } = await supabase
      .from("sessions_draft")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();

    console.log("Supabase query result:", { draft, error });

    if (error) {
      console.error("Get session draft by id error:", error);
      return { data: null, error: error.message };
    }

    if (!draft) {
      console.error("Draft not found for id:", draftId);
      return { data: null, error: "下書きが見つかりません" };
    }

    console.log("Successfully retrieved draft:", draft.id);
    return { data: draft, error: null };
  } catch (error) {
    console.error("Unexpected error in getSessionDraftById:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "予期しないエラーが発生しました"
    };
  }
}

export async function getSessionDraftByProductionId(productionSessionId: string) {
  const supabase = await createClient();

  // production_session_idからdraftを取得
  const { data: draft, error } = await supabase
    .from("sessions_draft")
    .select("*")
    .eq("production_session_id", productionSessionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Get session draft by production id error:", error);
    return { data: null, error: error.message };
  }

  if (!draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  return { data: draft, error: null };
}

