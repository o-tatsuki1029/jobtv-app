import { cookies } from "next/headers";
import { getAdminClient } from "@jobtv-app/shared/supabase/admin";

export async function getCandidateInfo() {
  const cookieStore = await cookies();
  const candidateId = cookieStore.get("candidate_id")?.value;
  const eventId = cookieStore.get("candidate_event_id")?.value;

  if (!candidateId) {
    throw new Error("ログインしていません");
  }

  // event-system はクッキー認証のため、admin client を使用（candidateId はルートハンドラで検証済み）
  const supabase = getAdminClient();

  // 学生情報を取得
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, profiles!profiles_candidate_id_fkey(email, last_name, first_name)")
    .eq("id", candidateId)
    .single();

  if (candidateError || !candidate) {
    throw new Error("学生情報の取得に失敗しました");
  }

  // 席番号を取得（event_idがある場合）
  let seatNumber: string | null = null;
  if (eventId) {
    const { data: reservation, error: reservationError } = await supabase
      .from("event_reservations")
      .select("seat_number")
      .eq("candidate_id", candidateId)
      .eq("event_id", eventId)
      .single();

    if (!reservationError && reservation) {
      seatNumber = reservation.seat_number;
    }
  }

  const row = candidate as { id: string; profiles: { email: string | null; last_name: string | null; first_name: string | null } | { email: string | null; last_name: string | null; first_name: string | null }[] | null };
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  // 名前の取得（profiles.last_name + profiles.first_name）
  const name = profile?.last_name && profile?.first_name
    ? `${profile.last_name} ${profile.first_name}`
    : profile?.last_name || profile?.first_name || "未設定";
  return {
    candidate: {
      id: row.id,
      name,
      email: profile?.email ?? null,
      seatNumber,
    },
  };
}
