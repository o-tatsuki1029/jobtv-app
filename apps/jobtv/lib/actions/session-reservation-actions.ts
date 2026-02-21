"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert } from "@jobtv-app/shared/types";

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
    phone: string;
    school_name: string | null;
    gender: string | null;
    graduation_year: number | null;
    profiles: { email: string | null } | null;
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
    console.error("Get session date reservation count error:", error);
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
    console.error("Get session date reservation counts error:", error);
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
    console.error("Get session dates error:", datesError);
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
    console.error("Get session reservation count error:", error);
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
        last_name,
        first_name,
        last_name_kana,
        first_name_kana,
        phone,
        school_name,
        gender,
        graduation_year,
        profiles!profiles_candidate_id_fkey (email)
      )
    `
    )
    .eq("session_date_id", sessionDateId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get session date reservations error:", error);
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
    console.error("Get session dates error:", datesError);
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
        last_name,
        first_name,
        last_name_kana,
        first_name_kana,
        phone,
        school_name,
        gender,
        graduation_year,
        profiles!profiles_candidate_id_fkey (email)
      )
    `
    )
    .in("session_date_id", dateIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Get session reservations error:", error);
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
 * 全ての予約を取得（最大100件、企業の説明会のみ）
 */
export async function getAllReservations(limit: number = 100, sessionId?: string | null) {
  const supabase = await createClient();

  // 現在のユーザーの企業IDを取得
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();

  if (!profile?.company_id) {
    return { data: null, error: "企業情報が見つかりません" };
  }

  // 企業の全説明会の日程IDを取得
  let query = supabase
    .from("session_dates")
    .select(
      `
      id,
      event_date,
      start_time,
      end_time,
      sessions!inner (
        id,
        title,
        company_id
      )
    `
    )
    .eq("sessions.company_id", profile.company_id);

  // セッションIDでフィルター
  if (sessionId) {
    query = query.eq("sessions.id", sessionId);
  }

  const { data: dates, error: datesError } = await query;

  if (datesError) {
    console.error("Get session dates error:", datesError);
    return { data: null, error: datesError.message };
  }

  if (!dates || dates.length === 0) {
    return { data: [], error: null };
  }

  const dateIds = dates.map((d) => d.id);

  // 全予約を取得
  const { data: reservations, error } = await supabase
    .from("session_reservations")
    .select(
      `
      *,
      candidates (
        last_name,
        first_name,
        last_name_kana,
        first_name_kana,
        phone,
        email,
        school_name,
        gender,
        graduation_year
      )
    `
    )
    .in("session_date_id", dateIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Get all reservations error:", error);
    return { data: null, error: error.message };
  }

  // 日程と説明会情報を含めて返す
  const reservationsWithInfo = (reservations as ReservationWithCandidate[]).map((reservation) => {
    const date = dates.find((d) => d.id === reservation.session_date_id);
    return {
      ...reservation,
      session_date: date
        ? {
            id: date.id,
            event_date: date.event_date,
            start_time: date.start_time,
            end_time: date.end_time
          }
        : null,
      session: date?.sessions
        ? {
            id: (date.sessions as any).id,
            title: (date.sessions as any).title
          }
        : null
    };
  });

  return { data: reservationsWithInfo, error: null };
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
      // 既存の候補者を更新
      const { error: updateError } = await supabase
        .from("candidates")
        .update({
          last_name: candidateData.last_name,
          first_name: candidateData.first_name,
          last_name_kana: candidateData.last_name_kana,
          first_name_kana: candidateData.first_name_kana,
          phone: candidateData.phone,
          school_name: candidateData.school_name || null,
          gender: candidateData.gender || null,
          graduation_year: candidateData.graduation_year || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", candidateId);

      if (updateError) {
        console.error("Update candidate error:", updateError);
        return { data: null, error: "候補者情報の更新に失敗しました" };
      }
    } else {
      // 新規候補者を作成（email は candidates に持たない。予約時点では profile 未作成のため、候補者のみ作成）
      const { data: newCandidate, error: candidateError } = await supabase
        .from("candidates")
        .insert({
          last_name: candidateData.last_name,
          first_name: candidateData.first_name,
          last_name_kana: candidateData.last_name_kana,
          first_name_kana: candidateData.first_name_kana,
          phone: candidateData.phone,
          school_name: candidateData.school_name || null,
          gender: candidateData.gender || null,
          graduation_year: candidateData.graduation_year || null
        })
        .select("id")
        .single();

      if (candidateError || !newCandidate) {
        console.error("Create candidate error:", candidateError);
        return { data: null, error: "候補者の作成に失敗しました" };
      }

      candidateId = newCandidate.id;
    }

    // 2. 既に予約が存在するかチェック
    const { data: existingReservation } = await supabase
      .from("session_reservations")
      .select("id")
      .eq("session_date_id", sessionDateId)
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (existingReservation) {
      return { data: null, error: "この日程には既に予約済みです" };
    }

    // 3. 予約を作成
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
      console.error("Create reservation error:", reservationError);
      return { data: null, error: "予約の作成に失敗しました" };
    }

    revalidatePath("/studio/sessions");
    return { data: reservation, error: null };
  } catch (error) {
    console.error("Create session reservation error:", error);
    return { data: null, error: "予約の作成に失敗しました" };
  }
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
    console.error("Update reservation status error:", error);
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
    console.error("Mark reservation attended error:", error);
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/sessions");
  return { data, error: null };
}

