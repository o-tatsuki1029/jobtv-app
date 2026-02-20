"use server";

import { createClient } from "@/lib/supabase/server";

export type Event = {
  id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  master_event_types: {
    name: string;
    area: string;
  };
};

/**
 * イベント一覧を取得
 */
export async function getEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      id,
      event_date,
      start_time,
      end_time,
      master_event_types (
        name,
        area
      )
    `
    )
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return data as unknown as Event[];
}

/**
 * メールアドレスから候補者が存在するかチェック
 */
export async function checkCandidateExists(email: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidates")
    .select("id, last_name, first_name, last_name_kana, first_name_kana, phone, school_name, gender, graduation_year")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("Error checking candidate:", error);
    return null;
  }

  return data;
}

type CandidateData = {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  phone: string;
  email: string;
  school_name?: string;
  gender?: string;
  graduation_year?: number;
};

type EventEntryData = {
  eventId: string;
  candidate: CandidateData;
};

/**
 * イベント予約エントリー処理
 * 1. 候補者を作成（既に存在する場合は取得）
 * 2. イベント予約を作成
 */
export async function createEventEntry({ eventId, candidate }: EventEntryData) {
  const supabase = await createClient();

  // 1. 候補者が既に存在するかチェック（電話番号とメールアドレスで検索）
  const { data: existingCandidates, error: searchError } = await supabase
    .from("candidates")
    .select("id")
    .or(`phone.eq.${candidate.phone},email.eq.${candidate.email}`)
    .limit(1)
    .maybeSingle();

  let candidateId: string;

  if (existingCandidates && !searchError) {
    // 既存の候補者を使用
    candidateId = existingCandidates.id;

    // 候補者情報を更新（最新の情報に更新）
    const { error: updateError } = await supabase
      .from("candidates")
      .update({
        last_name: candidate.last_name,
        first_name: candidate.first_name,
        last_name_kana: candidate.last_name_kana,
        first_name_kana: candidate.first_name_kana,
        phone: candidate.phone,
        email: candidate.email,
        school_name: candidate.school_name || null,
        gender: candidate.gender || null,
        graduation_year: candidate.graduation_year || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", candidateId);

    if (updateError) {
      throw new Error(`候補者情報の更新に失敗しました: ${updateError.message}`);
    }
  } else {
    // 新規候補者を作成
    const { data: newCandidate, error: insertError } = await supabase
      .from("candidates")
      .insert({
        last_name: candidate.last_name,
        first_name: candidate.first_name,
        last_name_kana: candidate.last_name_kana,
        first_name_kana: candidate.first_name_kana,
        phone: candidate.phone,
        email: candidate.email,
        school_name: candidate.school_name || null,
        gender: candidate.gender || null,
        graduation_year: candidate.graduation_year || null
      })
      .select()
      .single();

    if (insertError || !newCandidate) {
      throw new Error(`候補者の登録に失敗しました: ${insertError?.message || "不明なエラー"}`);
    }

    candidateId = newCandidate.id;
  }

  // 2. 既に予約が存在するかチェック
  const { data: existingReservation } = await supabase
    .from("event_reservations")
    .select("id")
    .eq("event_id", eventId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (existingReservation) {
    throw new Error("このイベントには既に予約済みです");
  }

  // 3. イベント予約を作成
  const { data: reservation, error: reservationError } = await supabase
    .from("event_reservations")
    .insert({
      event_id: eventId,
      candidate_id: candidateId,
      status: "reserved",
      attended: false,
      seat_number: null
    })
    .select()
    .single();

  if (reservationError || !reservation) {
    throw new Error(`予約の作成に失敗しました: ${reservationError?.message || "不明なエラー"}`);
  }

  return {
    candidateId,
    reservationId: reservation.id
  };
}

export type Session = {
  id: string;
  event_id: string;
  session_number: number;
  start_time: string;
  end_time: string;
  events: {
    id: string;
    event_date: string;
    master_event_types: {
      name: string;
      area: string;
    };
  };
};

/**
 * セッション一覧を取得（events用 - 旧システム）
 */
export async function getSessions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      id,
      event_id,
      session_number,
      start_time,
      end_time,
      events (
        id,
        event_date,
        master_event_types (
          name,
          area
        )
      )
    `
    )
    .order("event_date", { ascending: true })
    .order("session_number", { ascending: true });

  if (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }

  return data as unknown as Session[];
}

/**
 * 説明会の日程一覧を取得（session_dates用 - 新システム）
 */
export type SessionDate = {
  id: string;
  session_id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  session: {
    id: string;
    title: string;
    type: string;
    location_type: string | null;
    location_detail: string | null;
    company_id: string;
    companies: {
      name: string;
      logo_url: string | null;
    } | null;
  } | null;
};

export async function getAvailableSessionDates() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("session_dates")
    .select(
      `
      id,
      session_id,
      event_date,
      start_time,
      end_time,
      capacity,
      sessions!inner (
        id,
        title,
        type,
        location_type,
        location_detail,
        company_id,
        status,
        companies (
          name,
          logo_url
        )
      )
    `
    )
    .eq("sessions.status", "active")
    .gte("event_date", new Date().toISOString().split("T")[0])
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching session dates:", error);
    return [];
  }

  // データを整形
  const formattedData = (data as any[]).map((item) => ({
    id: item.id,
    session_id: item.session_id,
    event_date: item.event_date,
    start_time: item.start_time,
    end_time: item.end_time,
    capacity: item.capacity,
    session: item.sessions
  }));

  return formattedData as SessionDate[];
}

/**
 * セッションエントリー処理
 */
export async function createSessionEntry(formData: FormData) {
  const sessionId = formData.get("sessionId") as string;
  const candidateId = formData.get("candidateId") as string;

  if (!sessionId || !candidateId) {
    return { error: "セッションIDと候補者IDが必要です" };
  }

  const supabase = await createClient();

  // 既にエントリーが存在するかチェック
  const { data: existingEntry } = await supabase
    .from("session_entries")
    .select("id")
    .eq("session_id", sessionId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (existingEntry) {
    return { error: "このセッションには既にエントリー済みです" };
  }

  // セッションエントリーを作成
  const { data: entry, error: entryError } = await supabase
    .from("session_entries")
    .insert({
      session_id: sessionId,
      candidate_id: candidateId
    })
    .select()
    .single();

  if (entryError || !entry) {
    return { error: entryError?.message || "エントリーの作成に失敗しました" };
  }

  return { success: true, entryId: entry.id };
}

