import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@jobtv-app/shared/supabase/admin";

export async function getCandidateInfo() {
  const cookieStore = await cookies();
  const candidateId = cookieStore.get("candidate_id")?.value;
  const eventId = cookieStore.get("candidate_event_id")?.value;

  if (!candidateId) {
    throw new Error("ログインしていません");
  }

  // まず通常のクライアントで試行（RLSポリシーが適切に設定されていれば動作する）
  const supabase = await createClient();
  
  // 学生情報を取得（RLSポリシーで自分のデータのみアクセス可能）
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("id, last_name, first_name, profiles!profiles_candidate_id_fkey(email)")
    .eq("id", candidateId)
    .single();

  // RLSポリシーでアクセスできない場合は、管理者クライアントを使用（フォールバック）
  let finalCandidate = candidate;
  let finalSupabase = supabase;
  
  if (candidateError || !candidate) {
    // RLSポリシーが適切に設定されていない場合のフォールバック
    const adminSupabase = getAdminClient();
    const { data: adminCandidate, error: adminError } = await adminSupabase
      .from("candidates")
      .select("id, last_name, first_name, profiles!profiles_candidate_id_fkey(email)")
      .eq("id", candidateId)
      .single();
    
    if (adminError || !adminCandidate) {
      throw new Error("学生情報の取得に失敗しました");
    }
    
    finalCandidate = adminCandidate;
    finalSupabase = adminSupabase;
  }

  // 席番号を取得（event_idがある場合）
  let seatNumber: string | null = null;
  if (eventId) {
    const { data: reservation, error: reservationError } = await finalSupabase
      .from("event_reservations")
      .select("seat_number")
      .eq("candidate_id", candidateId)
      .eq("event_id", eventId)
      .single();

    if (!reservationError && reservation) {
      seatNumber = reservation.seat_number;
    }
  }

  // finalCandidateがnullでないことを確認（TypeScriptの型チェック用）
  if (!finalCandidate) {
    throw new Error("学生情報の取得に失敗しました");
  }

  // 名前の取得（last_name + first_name）
  const name = finalCandidate.last_name && finalCandidate.first_name
    ? `${finalCandidate.last_name} ${finalCandidate.first_name}`
    : finalCandidate.last_name || finalCandidate.first_name || "未設定";

  const row = finalCandidate as { id: string; last_name: string | null; first_name: string | null; profiles: { email: string | null } | { email: string | null }[] | null };
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    candidate: {
      id: row.id,
      name,
      email: profile?.email ?? null,
      seatNumber,
    },
  };
}

