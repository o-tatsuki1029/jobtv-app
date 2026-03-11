"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserCompanyId } from "@jobtv-app/shared/actions/company-utils";
import type { TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";
import { logger } from "@/lib/logger";

/** 一覧表示用：取得するドラフト列（軽量化） */
const LIST_SESSION_DRAFT_COLUMNS =
  "id,company_id,title,draft_status,production_session_id,cover_image_url,graduation_year,location_type,location_detail,type,capacity,created_at";

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
    .from("sessions_draft")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getSessions", err: error }, "説明会一覧の取得に失敗しました");
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
    logger.error({ action: "getSession", err: error, sessionId: id }, "説明会の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 説明会の公開/非公開を切り替え
 */
export async function toggleSessionStatus(productionSessionId: string, newStatus: "active" | "closed") {
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
  const { data: productionSession, error: sessionError } = await supabase
    .from("sessions")
    .select("company_id, status")
    .eq("id", productionSessionId)
    .single();

  if (sessionError || !productionSession) {
    return { data: null, error: "説明会が見つかりません" };
  }

  if (productionSession.company_id !== profile.company_id) {
    return { data: null, error: "権限がありません" };
  }

  // 本番テーブルのstatusを変更
  const { data, error } = await supabase
    .from("sessions")
    .update({ status: newStatus })
    .eq("id", productionSessionId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error({ action: "toggleSessionStatus", err: error, productionSessionId, newStatus }, "説明会ステータスの切り替えに失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  revalidatePath(`/session/${productionSessionId}`);
  return { data, error: null };
}

/**
 * 複数の説明会の予約数を一括取得
 */
export async function getSessionReservationCounts(sessionIds: string[]) {
  const supabase = await createClient();

  if (sessionIds.length === 0) {
    return { data: {}, error: null };
  }

  // 各説明会の全日程IDを取得
  const { data: allDates, error: datesError } = await supabase
    .from("session_dates")
    .select("id, session_id")
    .in("session_id", sessionIds);

  if (datesError) {
    logger.error({ action: "getSessionReservationCounts", err: datesError }, "説明会日程の取得に失敗しました");
    return { data: null, error: datesError.message };
  }

  if (!allDates || allDates.length === 0) {
    const counts: Record<string, number> = {};
    sessionIds.forEach((id) => {
      counts[id] = 0;
    });
    return { data: counts, error: null };
  }

  const dateIds = allDates.map((d) => d.id);

  // 予約を取得（session_dates を join して session_id を一括取得、逆引き不要）
  const { data: reservations, error } = await supabase
    .from("session_reservations")
    .select("session_date_id, session_dates(session_id)")
    .in("session_date_id", dateIds)
    .eq("status", "reserved");

  if (error) {
    logger.error({ action: "getSessionReservationCounts", err: error }, "説明会予約数の取得に失敗しました");
    return { data: null, error: error.message };
  }

  const counts: Record<string, number> = {};
  sessionIds.forEach((id) => {
    counts[id] = 0;
  });
  reservations?.forEach((row: { session_dates?: { session_id: string }[] | null }) => {
    const sessionId = Array.isArray(row.session_dates) ? row.session_dates[0]?.session_id : null;
    if (sessionId && sessionId in counts) counts[sessionId] += 1;
  });

  return { data: counts, error: null };
}

/**
 * 説明会の日程一覧を取得（本番テーブル - フロントページ用）
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
    logger.error({ action: "getSessionDates", err: error, sessionId }, "説明会日程の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/** 過去日程のフォーマット済み型（SessionDetailView で表示） */
export type SessionPastDateItem = {
  date: string;
  time: string;
  capacity: number | null;
  isPast: true;
  status: "実施済み";
};

/**
 * 過去の日程のみ取得・フォーマット（「過去の日程を見る」押下時にクライアントから呼ぶ）
 */
export async function getSessionPastDates(sessionId: string) {
  const { data: dates, error: datesError } = await getSessionDates(sessionId);
  if (datesError || !dates?.length) {
    return { data: [], error: null };
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const pastDates = dates.filter((d: { event_date: string }) => d.event_date < todayStr);
  if (pastDates.length === 0) {
    return { data: [], error: null };
  }

  const { data: session } = await getSession(sessionId);
  const sessionCapacity = session?.capacity ?? null;

  const formatTime = (time: string) => (time ? time.slice(0, 5) : "");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const formatted: SessionPastDateItem[] = pastDates
    .sort((a: { event_date: string }, b: { event_date: string }) => a.event_date.localeCompare(b.event_date))
    .map((date: any) => {
      const eventDate = new Date(date.event_date);
      const month = eventDate.getMonth() + 1;
      const day = eventDate.getDate();
      const weekday = weekdays[eventDate.getDay()];
      return {
        date: `${eventDate.getFullYear()}年${month}月${day}日 (${weekday})`,
        time: `${formatTime(date.start_time)} 〜 ${formatTime(date.end_time)}`,
        capacity: date.capacity ?? sessionCapacity ?? null,
        isPast: true as const,
        status: "実施済み" as const
      };
    });

  return { data: formatted, error: null };
}

/**
 * 説明会ドラフトの日程一覧を取得（ドラフトテーブル - スタジオ用）
 */
export async function getSessionDatesDraft(sessionDraftId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_dates_draft")
    .select("*")
    .eq("session_draft_id", sessionDraftId)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    logger.error({ action: "getSessionDatesDraft", err: error, sessionDraftId }, "下書き説明会日程の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 本番に公開されている説明会の日程一覧を取得（スタジオで「削除不可」判定に利用）
 */
export async function getProductionSessionDates(productionSessionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_dates")
    .select("event_date, start_time, end_time")
    .eq("session_id", productionSessionId)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    logger.error({ action: "getProductionSessionDates", err: error, productionSessionId }, "本番説明会日程の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

/**
 * 説明会ドラフトの日程を保存（一括更新）
 */
export async function saveSessionDatesDraft(
  sessionDraftId: string,
  dates: Array<{ event_date: string; start_time: string; end_time: string; capacity?: number | null }>
) {
  const supabase = await createClient();

  try {
    // 既存の日程を削除
    const { error: deleteError } = await supabase
      .from("session_dates_draft")
      .delete()
      .eq("session_draft_id", sessionDraftId);

    if (deleteError) {
      logger.error({ action: "saveSessionDatesDraft", err: deleteError, sessionDraftId }, "下書き日程の削除に失敗しました");
      return { data: null, error: deleteError.message };
    }

    // 新しい日程を追加
    if (dates.length > 0) {
      const datesToInsert = dates.map((date) => ({
        session_draft_id: sessionDraftId,
        event_date: date.event_date,
        start_time: date.start_time,
        end_time: date.end_time,
        capacity: date.capacity || null
      }));

      const { data: insertedDates, error: insertError } = await supabase
        .from("session_dates_draft")
        .insert(datesToInsert)
        .select();

      if (insertError) {
        logger.error({ action: "saveSessionDatesDraft", err: insertError, sessionDraftId }, "下書き日程の挿入に失敗しました");
        return { data: null, error: insertError.message };
      }

      return { data: insertedDates, error: null };
    }

    return { data: [], error: null };
  } catch (error) {
    logger.error({ action: "saveSessionDatesDraft", err: error, sessionDraftId }, "下書き日程の保存中に予期しないエラーが発生しました");
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
    logger.error({ action: "createSessionDraft", err: error }, "説明会下書きの作成に失敗しました");
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
    logger.error({ action: "updateSessionDraft", err: fetchError, draftId: id }, "説明会下書きの取得に失敗しました");
    return { data: null, error: fetchError.message };
  }

  // submitted、approved、rejectedの場合はdraftに戻す（編集可能にする）
  const updateData: TablesUpdate<"sessions_draft"> = {
    ...data,
    updated_at: new Date().toISOString()
  } as TablesUpdate<"sessions_draft">;

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
    .from("sessions_draft")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error({ action: "updateSessionDraft", err: error, draftId: id }, "説明会下書きの更新に失敗しました");
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
    .select("*, companies!company_id(name, logo_url)")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (draftByIdError || !draftById) {
    // IDで見つからない場合、最新のdraftを取得
    const { data: latestDraft, error: latestDraftError } = await supabase
      .from("sessions_draft")
      .select("*, companies!company_id(name, logo_url)")
      .eq("company_id", profile.company_id)
      .in("draft_status", ["draft", "submitted", "approved", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestDraftError) {
      logger.error({ action: "getSessionDraft", err: latestDraftError, draftId: id }, "最新の説明会下書きの取得に失敗しました");
      return { data: null, error: latestDraftError.message };
    }

    if (!latestDraft) {
      return { data: null, error: "下書きが見つかりません" };
    }

    // production_session_idがある場合、本番テーブルからstatusを取得（トグルボタン用）
    if (latestDraft.production_session_id) {
      const { data: productionSession } = await supabase
        .from("sessions")
        .select("status")
        .eq("id", latestDraft.production_session_id)
        .maybeSingle();

      if (productionSession) {
        (latestDraft as any).production_status = productionSession.status;
      }
    }

    return { data: latestDraft as SessionDraftData, error: null };
  }

  // production_session_idがある場合、本番テーブルからstatusを取得（トグルボタン用）
  if (draftById.production_session_id) {
    const { data: productionSession } = await supabase
      .from("sessions")
      .select("status")
      .eq("id", draftById.production_session_id)
      .maybeSingle();

    if (productionSession) {
      (draftById as any).production_status = productionSession.status;
    }
  }

  return { data: draftById as SessionDraftData, error: null };
}

/**
 * 企業ID指定で説明会ドラフト一覧を取得（一覧用・select 絞り。本番の display_order でソート）
 */
async function getSessionDraftsByCompanyId(companyId: string) {
  const supabase = await createClient();
  const { data: drafts, error } = await supabase
    .from("sessions_draft")
    .select(LIST_SESSION_DRAFT_COLUMNS)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getSessionDraftsByCompanyId", err: error, companyId }, "説明会下書き一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }
  if (!drafts || drafts.length === 0) return { data: [], error: null };

  const productionIds = drafts.filter((d) => d.production_session_id).map((d) => d.production_session_id!);
  let productionDisplayOrders: Record<string, number | null> = {};
  if (productionIds.length > 0) {
    const { data: productions } = await supabase.from("sessions").select("id, display_order").in("id", productionIds);
    if (productions) for (const p of productions) productionDisplayOrders[p.id] = p.display_order;
  }

  const draftsWithOrder = drafts.map((draft) => ({
    ...draft,
    display_order: draft.production_session_id ? productionDisplayOrders[draft.production_session_id] ?? null : null
  }));
  draftsWithOrder.sort((a, b) => {
    if (a.display_order === null && b.display_order === null)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (a.display_order === null) return 1;
    if (b.display_order === null) return -1;
    return a.display_order - b.display_order;
  });
  return { data: draftsWithOrder, error: null };
}

/**
 * 説明会draft一覧を取得（ログインユーザーの企業のdraftのみ。一覧用に select 絞り）
 */
export async function getSessionDrafts() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "ログインが必要です" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (profileError || !profile?.company_id) return { data: null, error: "企業情報が見つかりません" };

  return getSessionDraftsByCompanyId(profile.company_id);
}

/**
 * スタジオ説明会一覧用：認証1回でドラフト一覧＋予約数を返す（カバー画像は別途遅延取得）
 */
export async function getStudioSessionsPageData(): Promise<{
  data: Awaited<ReturnType<typeof getSessionDrafts>>["data"] extends infer T ? T : never;
  error: string | null;
}> {
  const { companyId, error: companyError } = await getUserCompanyId();
  if (companyError) return { data: null, error: companyError };

  const { data, error } = await getSessionDraftsByCompanyId(companyId);
  if (error) return { data: null, error };
  if (!data || data.length === 0) return { data: [], error: null };

  const productionSessionIds = data
    .filter((d) => d.production_session_id)
    .map((d) => d.production_session_id!);
  const { data: countsData } =
    productionSessionIds.length > 0 ? await getSessionReservationCounts(productionSessionIds) : { data: {} };
  const counts = (countsData || {}) as Record<string, number>;

  const sessionsWithCounts = data.map((draft) => ({
    ...draft,
    id: draft.id,
    status: draft.draft_status === "approved" ? "active" : draft.draft_status === "rejected" ? "closed" : "draft",
    draft_status: draft.draft_status,
    reservationCount: draft.production_session_id ? (counts[draft.production_session_id] ?? 0) : 0
  }));

  return { data: sessionsWithCounts, error: null };
}

/**
 * 説明会draftを審査申請（本番テーブルにコピー）
 */
export async function submitSessionForReview(draftId: string, keepProductionActive: boolean = true) {
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

  const { data: updatedDraft, error: updateError } = await supabase
    .from("sessions_draft")
    .update(updateData)
    .eq("id", draftId)
    .select()
    .single();

  if (updateError) {
    logger.error({ action: "submitSessionForReview", err: updateError, draftId }, "説明会の審査申請ステータス更新に失敗しました");
    return { data: null, error: updateError.message };
  }

  // 更新後の状態を確認
  if (updatedDraft?.draft_status !== "submitted") {
    return { data: null, error: "ドラフトステータスの更新に失敗しました" };
  }

  // 審査申請時に本番説明会を非公開にする場合
  if (!keepProductionActive && draft.production_session_id) {
    const { error: productionUpdateError } = await supabase
      .from("sessions")
      .update({ status: "closed" })
      .eq("id", draft.production_session_id);

    if (productionUpdateError) {
      logger.error({ action: "submitSessionForReview", err: productionUpdateError, productionSessionId: draft.production_session_id }, "本番説明会の非公開化に失敗しました");
      // エラーが発生しても審査申請は成功とみなす
    }
  }

  revalidatePath("/studio/sessions");
  revalidatePath("/admin/review");
  return { data: updatedDraft, error: null };
}

/**
 * 説明会の表示順序を更新（本番テーブル）
 * ドラフトIDから本番IDを取得して、本番テーブルの表示順序を更新
 */
export async function reorderSessions(orders: Array<{ id: string; display_order: number }>) {
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
      .from("sessions_draft")
      .select("id, production_session_id")
      .in("id", draftIds)
      .eq("company_id", profile.company_id);

    if (draftsError) {
      logger.error({ action: "reorderSessions", err: draftsError }, "説明会下書き一覧の取得に失敗しました");
      return { data: null, error: draftsError.message };
    }

    // ドラフトIDと本番IDのマッピングを作成
    const draftToProduction = new Map<string, string>();
    for (const draft of drafts || []) {
      if (draft.production_session_id) {
        draftToProduction.set(draft.id, draft.production_session_id);
      }
    }

    // 本番テーブルの表示順序を更新
    for (const order of orders) {
      const productionId = draftToProduction.get(order.id);
      if (productionId) {
        const { error } = await supabase
          .from("sessions")
          .update({ display_order: order.display_order })
          .eq("id", productionId)
          .eq("company_id", profile.company_id);

        if (error) {
          logger.error({ action: "reorderSessions", err: error, productionId }, "説明会の並び順更新に失敗しました");
          return { data: null, error: error.message };
        }
      }
    }

    revalidatePath("/studio/sessions");
    return { data: true, error: null };
  } catch (error) {
    logger.error({ action: "reorderSessions", err: error }, "説明会の並び替え中に予期しないエラーが発生しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "並び替えに失敗しました"
    };
  }
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
      logger.error({ action: "uploadSessionDraftCoverImage", err: uploadError, draftId }, "説明会カバー画像のアップロードに失敗しました");
      return { data: null, error: uploadError.message };
    }

    // 公開URLを取得
    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    return { data: publicUrl, error: null };
  } catch (error) {
    logger.error({ action: "uploadSessionDraftCoverImage", err: error, draftId }, "説明会カバー画像のアップロード中に予期しないエラーが発生しました");
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

    const { data: draft, error } = await supabase.from("sessions_draft").select("*").eq("id", draftId).maybeSingle();

    if (error) {
      logger.error({ action: "getSessionDraftById", err: error, draftId }, "説明会下書きの取得に失敗しました");
      return { data: null, error: error.message };
    }

    if (!draft) {
      logger.error({ action: "getSessionDraftById", draftId }, "指定IDの下書きが見つかりません");
      return { data: null, error: "下書きが見つかりません" };
    }

    return { data: draft, error: null };
  } catch (error) {
    logger.error({ action: "getSessionDraftById", err: error, draftId }, "説明会下書きの取得中に予期しないエラーが発生しました");
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
    logger.error({ action: "getSessionDraftByProductionId", err: error, productionSessionId }, "本番IDからの下書き取得に失敗しました");
    return { data: null, error: error.message };
  }

  if (!draft) {
    return { data: null, error: "下書きが見つかりません" };
  }

  return { data: draft, error: null };
}
