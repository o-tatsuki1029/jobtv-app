"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserCompanyId } from "@jobtv-app/shared/actions/company-utils";
import type { Tables, TablesInsert } from "@jobtv-app/shared/types";
import { sendSessionReservationNotification, sendSessionReservationConfirmation } from "@/lib/email/send-entry-notification";
import { logger } from "@/lib/logger";

type SessionReservation = Tables<"session_reservations">;
type SessionReservationInsert = TablesInsert<"session_reservations">;

/**
 * 候補者情報の型定義
 */
export interface CandidateData {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  phone: string;
  email: string;
  school_name?: string;
  gender?: string;
  graduation_year?: number;
}

/**
 * 予約者情報（候補者情報と profiles の email を含む）
 */
export interface ReservationWithCandidate extends SessionReservation {
  candidates: {
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
    phone: string | null;
    school_name: string | null;
    school_type: string | null;
    faculty_name: string | null;
    department_name: string | null;
    gender: string | null;
    date_of_birth: string | null;
    graduation_year: number | null;
    major_field: string | null;
    desired_work_location: string | null;
    desired_industry: string[] | null;
    desired_job_type: string[] | null;
    assigned_to: string | null;
    profiles: { email: string | null; last_name?: string | null; first_name?: string | null; last_name_kana?: string | null; first_name_kana?: string | null } | null;
  } | null;
}

/**
 * 日程別の予約数を取得
 */
export async function getSessionDateReservationCount(sessionDateId: string) {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("session_reservations")
    .select("*", { count: "exact", head: true })
    .eq("session_date_id", sessionDateId)
    .eq("status", "reserved");

  if (error) {
    logger.error({ action: "getSessionDateReservationCount", err: error, sessionDateId }, "日程別予約数の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: count || 0, error: null };
}

/**
 * 複数の日程の予約数を一括取得（未ログインでも可。RPC で件数のみ返す）
 */
export async function getSessionDateReservationCounts(sessionDateIds: string[]) {
  const supabase = await createClient();

  if (sessionDateIds.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase.rpc("get_public_session_date_reservation_counts", {
    session_date_ids: sessionDateIds
  });

  if (error) {
    logger.error({ action: "getSessionDateReservationCounts", err: error }, "日程別予約数の一括取得に失敗しました");
    return { data: null, error: error.message };
  }

  const counts: Record<string, number> = {};
  sessionDateIds.forEach((id) => {
    counts[id] = 0;
  });
  (data as { session_date_id: string; reservation_count: number }[] | null)?.forEach((row) => {
    if (row.session_date_id) {
      counts[row.session_date_id] = Number(row.reservation_count) || 0;
    }
  });

  return { data: counts, error: null };
}

/**
 * 説明会全体の予約数を取得（全日程の合計）
 */
export async function getSessionReservationCount(sessionId: string) {
  const supabase = await createClient();

  // まず、この説明会の全日程IDを取得
  const { data: dates, error: datesError } = await supabase
    .from("session_dates")
    .select("id")
    .eq("session_id", sessionId);

  if (datesError) {
    logger.error({ action: "getSessionReservationCount", err: datesError, sessionId }, "説明会日程の取得に失敗しました");
    return { data: null, error: datesError.message };
  }

  if (!dates || dates.length === 0) {
    return { data: 0, error: null };
  }

  const dateIds = dates.map((d) => d.id);

  // 全日程の予約数を取得
  const { count, error } = await supabase
    .from("session_reservations")
    .select("*", { count: "exact", head: true })
    .in("session_date_id", dateIds)
    .eq("status", "reserved");

  if (error) {
    logger.error({ action: "getSessionReservationCount", err: error, sessionId }, "説明会予約数の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: count || 0, error: null };
}

/**
 * 特定の日程の予約一覧を取得（候補者情報を含む）
 */
export async function getSessionDateReservations(sessionDateId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_reservations")
    .select(
      `
      *,
      candidates (
        phone,
        school_name,
        gender,
        graduation_year,
        profiles!profiles_candidate_id_fkey (email, last_name, first_name, last_name_kana, first_name_kana)
      )
    `
    )
    .eq("session_date_id", sessionDateId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getSessionDateReservations", err: error, sessionDateId }, "日程別予約一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data as ReservationWithCandidate[], error: null };
}

/**
 * 説明会全体の予約一覧を取得（全日程分）
 */
export async function getSessionReservations(sessionId: string) {
  const supabase = await createClient();

  // まず、この説明会の全日程IDを取得
  const { data: dates, error: datesError } = await supabase
    .from("session_dates")
    .select("id, event_date, start_time, end_time")
    .eq("session_id", sessionId)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (datesError) {
    logger.error({ action: "getSessionReservations", err: datesError, sessionId }, "説明会日程の取得に失敗しました");
    return { data: null, error: datesError.message };
  }

  if (!dates || dates.length === 0) {
    return { data: [], error: null };
  }

  const dateIds = dates.map((d) => d.id);

  // 全日程の予約を取得
  const { data: reservations, error } = await supabase
    .from("session_reservations")
    .select(
      `
      *,
      candidates (
        phone,
        school_name,
        gender,
        graduation_year,
        profiles!profiles_candidate_id_fkey (email, last_name, first_name, last_name_kana, first_name_kana)
      )
    `
    )
    .in("session_date_id", dateIds)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getSessionReservations", err: error, sessionId }, "説明会予約一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }

  // 日程情報を含めて返す
  const reservationsWithDate = (reservations as ReservationWithCandidate[]).map((reservation) => {
    const date = dates.find((d) => d.id === reservation.session_date_id);
    return {
      ...reservation,
      session_date: date
    };
  });

  return { data: reservationsWithDate, error: null };
}

/**
 * 全ての予約を取得（企業の説明会のみ）
 * 求人管理のエントリー数取得と同様に、getUserCompanyId で企業を特定し、
 * 予約・候補者・メールを別クエリで取得してマージする（RPC 不要）。
 */
export async function getAllReservations({
  limit = 20,
  offset = 0,
  sessionId
}: {
  limit?: number;
  offset?: number;
  sessionId?: string | null;
} = {}) {
  const supabase = await createClient();

  const { companyId, error: companyError } = await getUserCompanyId();
  if (companyError) {
    return { data: null, count: null, error: companyError };
  }
  if (!companyId) {
    return { data: [], count: 0, error: null };
  }

  // 1. 自社の説明会（本番）を取得（求人一覧で job を取るのと同じ考え方）
  let sessionsQuery = supabase.from("sessions").select("id, title, graduation_year").eq("company_id", companyId);
  if (sessionId) {
    sessionsQuery = sessionsQuery.eq("id", sessionId);
  }
  const { data: sessions, error: sessionsError } = await sessionsQuery;

  if (sessionsError) {
    logger.error({ action: "getAllReservations", err: sessionsError }, "説明会一覧の取得に失敗しました");
    return { data: null, count: null, error: sessionsError.message };
  }
  if (!sessions || sessions.length === 0) {
    return { data: [], count: 0, error: null };
  }

  // 2. 予約を「session_dates → sessions の company_id」で取得（dateIds で絞らない）
  //    自社のいずれかの説明会に紐づく予約をすべて取得する
  let reservationsQuery = supabase
    .from("session_reservations")
    .select(
      `
      id,
      session_date_id,
      candidate_id,
      status,
      attended,
      created_at,
      updated_at,
      session_dates!inner (
        id,
        event_date,
        start_time,
        end_time,
        session_id,
        sessions!inner (id, title, company_id)
      )
    `,
      { count: "exact" }
    )
    .eq("session_dates.sessions.company_id", companyId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (sessionId) {
    reservationsQuery = reservationsQuery.eq("session_dates.sessions.id", sessionId);
  }

  const { data: reservationsRaw, count: totalCount, error: reservationsError } = await reservationsQuery;

  if (reservationsError) {
    logger.error({ action: "getAllReservations", err: reservationsError }, "全予約一覧の取得に失敗しました");
    return { data: null, count: null, error: reservationsError.message };
  }
  if (!reservationsRaw || reservationsRaw.length === 0) {
    return { data: [], count: totalCount ?? 0, error: null };
  }

  type ReservationRow = Record<string, unknown> & {
    session_dates?: {
      id?: string;
      event_date?: string;
      start_time?: string;
      end_time?: string;
      session_id?: string;
      sessions?: { id?: string; title?: string } | { id?: string; title?: string }[];
    };
  };

  const reservations = (reservationsRaw as ReservationRow[]).map((r) => ({
    id: r.id as string,
    session_date_id: r.session_date_id as string,
    candidate_id: r.candidate_id as string,
    status: r.status as string,
    attended: r.attended as boolean,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string
  }));

  const sessionMap = new Map<string, { id: string; title: string; graduation_year: number | null }>();
  const datesByReservation = new Map<
    string,
    { id: string; event_date: string; start_time: string; end_time: string; session_id: string } | null
  >();

  (reservationsRaw as ReservationRow[]).forEach((r) => {
    const sd = r.session_dates;
    const s = Array.isArray(sd?.sessions) ? sd?.sessions?.[0] : sd?.sessions;
    if (s?.id) {
      sessionMap.set(String(s.id), { id: String(s.id), title: String(s.title ?? ""), graduation_year: (s as { graduation_year?: number | null }).graduation_year ?? null });
    }
    if (r.session_date_id && sd) {
      datesByReservation.set(String(r.session_date_id), {
        id: String(sd.id ?? ""),
        event_date: String(sd.event_date ?? ""),
        start_time: String(sd.start_time ?? ""),
        end_time: String(sd.end_time ?? ""),
        session_id: String(sd.session_id ?? "")
      });
    }
  });

  // 4. 候補者IDをまとめて、候補者＋メール＋名前を一括取得（名前は profiles に集約）
  const candidateIds = [...new Set(reservations.map((r) => r.candidate_id))];
  const { data: candidatesRows, error: candidatesError } = await supabase
    .from("candidates")
    .select(
      `
      id,
      gender, date_of_birth, phone,
      school_name, school_type, faculty_name, department_name, major_field, graduation_year,
      desired_work_location, desired_industry, desired_job_type,
      candidate_management(assigned_to),
      profiles!profiles_candidate_id_fkey (email, last_name, first_name, last_name_kana, first_name_kana)
    `
    )
    .in("id", candidateIds);

  if (candidatesError) {
    logger.error({ action: "getAllReservations", err: candidatesError }, "予約候補者情報の取得に失敗しました");
    return { data: null, count: null, error: candidatesError.message };
  }

  const candidateMap = new Map<
    string,
    {
      last_name: string;
      first_name: string;
      last_name_kana: string;
      first_name_kana: string;
      phone: string | null;
      school_name: string | null;
      school_type: string | null;
      faculty_name: string | null;
      department_name: string | null;
      gender: string | null;
      date_of_birth: string | null;
      graduation_year: number | null;
      major_field: string | null;
      desired_work_location: string | null;
      desired_industry: string[] | null;
      desired_job_type: string[] | null;
      assigned_to: string | null;
      profiles: { email: string | null } | null;
    }
  >();
  (candidatesRows ?? []).forEach((c: Record<string, unknown>) => {
    const prof = Array.isArray(c.profiles) && c.profiles.length > 0
      ? c.profiles[0] as { email: string | null; last_name: string | null; first_name: string | null; last_name_kana: string | null; first_name_kana: string | null }
      : c.profiles as { email: string | null; last_name: string | null; first_name: string | null; last_name_kana: string | null; first_name_kana: string | null } | null;
    const mgmt = Array.isArray(c.candidate_management) ? (c.candidate_management as { assigned_to?: string | null }[])[0] : c.candidate_management as { assigned_to?: string | null } | null;
    candidateMap.set(c.id as string, {
      last_name: prof?.last_name ?? "",
      first_name: prof?.first_name ?? "",
      last_name_kana: prof?.last_name_kana ?? "",
      first_name_kana: prof?.first_name_kana ?? "",
      phone: (c.phone as string | null) ?? null,
      school_name: (c.school_name as string | null) ?? null,
      school_type: (c.school_type as string | null) ?? null,
      faculty_name: (c.faculty_name as string | null) ?? null,
      department_name: (c.department_name as string | null) ?? null,
      gender: (c.gender as string | null) ?? null,
      date_of_birth: (c.date_of_birth as string | null) ?? null,
      graduation_year: (c.graduation_year as number | null) ?? null,
      major_field: (c.major_field as string | null) ?? null,
      desired_work_location: (c.desired_work_location as string | null) ?? null,
      desired_industry: (c.desired_industry as string[] | null) ?? null,
      desired_job_type: (c.desired_job_type as string[] | null) ?? null,
      assigned_to: mgmt?.assigned_to ?? null,
      profiles: prof ? { email: prof.email } : null
    });
  });

  const reservationsWithInfo = reservations.map((reservation) => {
    const date = datesByReservation.get(reservation.session_date_id) ?? null;
    const session = date ? sessionMap.get(date.session_id) ?? null : null;
    const candidate = candidateMap.get(reservation.candidate_id) ?? null;

    return {
      ...reservation,
      session_date: date
        ? { id: date.id, event_date: date.event_date, start_time: date.start_time, end_time: date.end_time }
        : null,
      session: session ? { id: session.id, title: session.title, graduation_year: session.graduation_year } : null,
      candidates: candidate
    };
  });

  return { data: reservationsWithInfo, count: totalCount ?? 0, error: null };
}

/**
 * 予約を作成（候補者も同時に作成）
 */
export async function createSessionReservation(sessionDateId: string, candidateData: CandidateData) {
  const supabase = await createClient();

  try {
    // 1. 候補者を作成または取得（メールは profiles で検索）
    const { data: profileByEmail } = await supabase
      .from("profiles")
      .select("candidate_id")
      .eq("email", candidateData.email)
      .maybeSingle();

    let candidateId: string | null = profileByEmail?.candidate_id ?? null;

    if (candidateId) {
      // 既存の候補者を更新（名前は profiles に）
      const { error: updateError } = await supabase
        .from("candidates")
        .update({
          phone: candidateData.phone,
          school_name: candidateData.school_name || null,
          gender: candidateData.gender || null,
          graduation_year: candidateData.graduation_year || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidateId);

      if (updateError) {
        logger.error({ action: "createSessionReservation", err: updateError, candidateId }, "候補者情報の更新に失敗しました");
        return { data: null, error: "候補者情報の更新に失敗しました" };
      }

      // profiles の名前を更新
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          last_name: candidateData.last_name,
          first_name: candidateData.first_name,
          last_name_kana: candidateData.last_name_kana,
          first_name_kana: candidateData.first_name_kana,
          updated_at: new Date().toISOString()
        })
        .eq("candidate_id", candidateId);

      if (profileUpdateError) {
        logger.error({ action: "createSessionReservation", err: profileUpdateError, candidateId }, "プロフィール名の更新に失敗しました");
      }
    } else {
      // 新規候補者を作成（名前は profiles に保存）
      const { data: newCandidate, error: candidateError } = await supabase
        .from("candidates")
        .insert({
          phone: candidateData.phone,
          school_name: candidateData.school_name || null,
          gender: candidateData.gender || null,
          graduation_year: candidateData.graduation_year || null
        })
        .select("id")
        .single();

      if (candidateError || !newCandidate) {
        logger.error({ action: "createSessionReservation", err: candidateError }, "候補者の作成に失敗しました");
        return { data: null, error: "候補者の作成に失敗しました" };
      }

      candidateId = newCandidate.id;

      // NOTE: 予約時点ではまだ profiles が存在しない場合がある（未ログインユーザー）。
      // 名前は後で profiles に紐付く際に設定される。
    }

    // 2. 定員チェック（日程 or 説明会の定員を超えていたら予約不可）
    const { data: sessionDateRow, error: dateErr } = await supabase
      .from("session_dates")
      .select("id, capacity, session_id, sessions(capacity)")
      .eq("id", sessionDateId)
      .single();

    if (dateErr || !sessionDateRow) {
      return { data: null, error: "日程が見つかりません" };
    }

    const dateRow = sessionDateRow as { capacity?: number | null; sessions?: { capacity?: number | null } | null };
    const capacity = dateRow.capacity ?? dateRow.sessions?.capacity ?? null;
    if (capacity != null) {
      const { data: count } = await getSessionDateReservationCount(sessionDateId);
      const reserved = count ?? 0;
      if (reserved >= capacity) {
        return { data: null, error: "この日程は満員のため予約できません" };
      }
    }

    // 3. 既に予約が存在するかチェック
    const { data: existingReservation } = await supabase
      .from("session_reservations")
      .select("id")
      .eq("session_date_id", sessionDateId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (existingReservation) {
      return { data: null, error: "この日程には既に予約済みです" };
    }

    // 4. 予約を作成
    const { data: reservation, error: reservationError } = await supabase
      .from("session_reservations")
      .insert({
        session_date_id: sessionDateId,
        candidate_id: candidateId,
        status: "reserved",
        attended: false
      })
      .select()
      .single();

    if (reservationError || !reservation) {
      logger.error({ action: "createSessionReservation", err: reservationError, sessionDateId, candidateId }, "予約の作成に失敗しました");
      return { data: null, error: "予約の作成に失敗しました" };
    }

    revalidatePath("/studio/sessions");
    return { data: reservation, error: null };
  } catch (error) {
    logger.error({ action: "createSessionReservation", err: error, sessionDateId }, "予約作成で予期しないエラーが発生しました");
    return { data: null, error: "予約の作成に失敗しました" };
  }
}

/**
 * ログイン中の学生（candidate）が説明会の日程に参加予約する。
 * profiles.candidate_id を使用し、候補者情報の入力は不要。
 */
export async function createSessionReservationForLoggedInCandidate(sessionDateId: string) {
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
    logger.error({ action: "createSessionReservationForLoggedInCandidate", err: profileError }, "プロフィールの取得に失敗しました");
    return { data: null, error: "プロフィールを取得できませんでした" };
  }

  if (profile.role !== "candidate" || !profile.candidate_id) {
    return { data: null, error: "求職者アカウントでログインしてください" };
  }

  const candidateId = profile.candidate_id;

  // 該当日程が公開中説明会のものか確認し、定員も取得
  const { data: sessionDateRow, error: dateError } = await supabase
    .from("session_dates")
    .select("id, capacity, session_id, sessions(status, capacity)")
    .eq("id", sessionDateId)
    .single();

  if (dateError || !sessionDateRow) {
    return { data: null, error: "日程が見つかりません" };
  }

  const sessionDate = sessionDateRow as { id: string; capacity?: number | null; session_id: string; sessions?: { status?: string; capacity?: number | null } | null };
  const session = sessionDate.sessions;
  if (!session || session.status !== "active") {
    return { data: null, error: "この説明会は現在予約できません" };
  }

  // 定員チェック（日程 or 説明会の定員を超えていたら予約不可）
  const capacity = sessionDate.capacity ?? session.capacity ?? null;
  if (capacity != null) {
    const { data: count } = await getSessionDateReservationCount(sessionDateId);
    const reserved = count ?? 0;
    if (reserved >= capacity) {
      return { data: null, error: "この日程は満員のため予約できません" };
    }
  }

  // 既に予約済みかチェック
  const { data: existingReservation } = await supabase
    .from("session_reservations")
    .select("id")
    .eq("session_date_id", sessionDateId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (existingReservation) {
    return { data: null, error: "この日程には既に予約済みです" };
  }

  const { data: reservation, error: reservationError } = await supabase
    .from("session_reservations")
    .insert({
      session_date_id: sessionDateId,
      candidate_id: candidateId,
      status: "reserved",
      attended: false
    })
    .select()
    .single();

  if (reservationError || !reservation) {
    logger.error({ action: "createSessionReservationForLoggedInCandidate", err: reservationError, sessionDateId, candidateId }, "予約の作成に失敗しました");
    return { data: null, error: "予約の作成に失敗しました" };
  }

  revalidatePath("/", "layout");
  revalidatePath(`/session/${sessionDate.session_id}`);

  sendSessionReservationNotification(sessionDateId, candidateId).catch((err) =>
    logger.error({ action: "createSessionReservationForLoggedInCandidate", err, sessionDateId, candidateId }, "予約通知メールの送信に失敗しました")
  );
  sendSessionReservationConfirmation(sessionDateId, candidateId).catch((err) =>
    logger.error({ action: "createSessionReservationForLoggedInCandidate", err, sessionDateId, candidateId }, "説明会予約確認メール（学生向け）の送信に失敗しました")
  );

  return { data: reservation, error: null };
}

/**
 * ログイン中の学生が指定した日程IDのうち、既に予約済みのID一覧を返す。
 * 未ログイン・非 candidate の場合は空配列を返す。
 */
export async function getReservedSessionDateIdsForCurrentCandidate(sessionDateIds: string[]) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("candidate_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.candidate_id || profile.role !== "candidate") {
    return { data: [], error: null };
  }

  if (sessionDateIds.length === 0) return { data: [], error: null };

  const { data: rows, error } = await supabase
    .from("session_reservations")
    .select("session_date_id")
    .eq("candidate_id", profile.candidate_id)
    .eq("status", "reserved")
    .in("session_date_id", sessionDateIds);

  if (error) {
    logger.error({ action: "getReservedSessionDateIdsForCurrentCandidate", err: error }, "予約済み日程IDの取得に失敗しました");
    return { data: [], error: null };
  }

  const reserved = (rows ?? []).map((r) => r.session_date_id).filter(Boolean);
  return { data: reserved, error: null };
}

/**
 * 予約ステータスを更新
 */
export async function updateReservationStatus(reservationId: string, status: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_reservations")
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq("id", reservationId)
    .select()
    .single();

  if (error) {
    logger.error({ action: "updateReservationStatus", err: error, reservationId, status }, "予約ステータスの更新に失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { data, error: null };
}

/**
 * 予約をキャンセル
 */
export async function cancelReservation(reservationId: string) {
  return await updateReservationStatus(reservationId, "cancelled");
}

/**
 * 出席確認を更新
 */
export async function markReservationAttended(reservationId: string, attended: boolean) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_reservations")
    .update({
      attended,
      updated_at: new Date().toISOString()
    })
    .eq("id", reservationId)
    .select()
    .single();

  if (error) {
    logger.error({ action: "markReservationAttended", err: error, reservationId, attended }, "出席確認の更新に失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { data, error: null };
}

