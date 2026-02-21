import { EventReservation } from "@/types/eventReservation.types";

export type ReservationWithCandidate = EventReservation & {
  candidates: {
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
    phone: string | null;
    school_name: string | null;
    gender: string | null;
    profiles: { email: string | null } | null;
  } | null;
};

export type FormattedReservation = {
  id: string;
  event_id: string;
  candidate_id: string;
  seat_number: string;
  attended: "出席" | "未出席";
  candidate_name: string;
  candidate_kana: string;
  phone: string;
  email: string;
  school_name: string;
  gender: string | null;
};

/**
 * 予約データを表示用にフォーマット
 */
export function formatReservationData(
  reservations: ReservationWithCandidate[]
): FormattedReservation[] {
  return reservations.map((reservation) => {
    // candidate_idを使用
    const candidateId = reservation.candidate_id || "";
    
    return {
    id: reservation.id,
    event_id: reservation.event_id,
    candidate_id: candidateId,
    seat_number: reservation.seat_number || "",
    attended: reservation.attended ? "出席" : "未出席",
    candidate_name: reservation.candidates
      ? `${reservation.candidates.last_name} ${reservation.candidates.first_name}`
      : "不明",
    candidate_kana: reservation.candidates
      ? `${reservation.candidates.last_name_kana} ${reservation.candidates.first_name_kana}`
      : "不明",
    phone: reservation.candidates?.phone || "",
    email: reservation.candidates?.profiles?.email ?? "",
    school_name: reservation.candidates?.school_name || "",
    gender: reservation.candidates?.gender || null,
    };
  });
}

/**
 * 席番号を比較（例: "A1" < "A2" < "B1"）
 */
function compareSeatNumbers(seatA: string, seatB: string): number {
  const matchA = seatA.match(/^([A-Z])(\d+)$/);
  const matchB = seatB.match(/^([A-Z])(\d+)$/);

  if (matchA && matchB) {
    const letterA = matchA[1];
    const letterB = matchB[1];
    const numA = parseInt(matchA[2], 10);
    const numB = parseInt(matchB[2], 10);

    // アルファベットで比較
    if (letterA !== letterB) {
      return letterA.localeCompare(letterB);
    }
    // 数字で比較
    return numA - numB;
  }

  // 席番号の形式が不正な場合は文字列比較
  return seatA.localeCompare(seatB);
}

/**
 * 予約データをソート（未出席を上に、出席済みを席番号順に）
 */
export function sortReservations(
  reservations: FormattedReservation[]
): FormattedReservation[] {
  return [...reservations].sort((a, b) => {
    // 出席状況でソート（未出席を上に）
    if (a.attended === "未出席" && b.attended === "出席") {
      return -1;
    }
    if (a.attended === "出席" && b.attended === "未出席") {
      return 1;
    }

    // 両方出席済みの場合は席番号順
    if (a.attended === "出席" && b.attended === "出席") {
      return compareSeatNumbers(a.seat_number, b.seat_number);
    }

    // 両方未出席の場合は元の順序を維持
    return 0;
  });
}

/**
 * 席番号を解析（例: "A1" -> { letter: "A", number: "1" }）
 */
export function parseSeatNumber(seatNumber: string | null): {
  letter: string;
  number: string;
} | null {
  if (!seatNumber) return null;
  const match = seatNumber.match(/^([A-Z])(\d+)$/);
  if (match) {
    return { letter: match[1], number: match[2] };
  }
  return null;
}

