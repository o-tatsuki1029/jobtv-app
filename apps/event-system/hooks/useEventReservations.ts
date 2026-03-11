import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Event } from "@/types/event.types";
import {
  formatReservationData,
  sortReservations,
  type FormattedReservation,
  type ReservationWithCandidate,
} from "@/utils/events/reservation";

type UseEventReservationsReturn = {
  event: Event | null;
  reservations: FormattedReservation[];
  isLoading: boolean;
  fetchEvent: () => Promise<void>;
  fetchReservations: () => Promise<void>;
};

/**
 * イベント予約データ管理のカスタムフック
 */
export function useEventReservations(
  eventId: string
): UseEventReservationsReturn {
  const [event, setEvent] = useState<Event | null>(null);
  const [reservations, setReservations] = useState<FormattedReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEvent = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select(
        `
        *,
        event_types (
          name,
          target_graduation_year,
          area
        )
      `
      )
      .eq("id", eventId)
      .single();

    if (error) {
      console.error("イベント取得エラー:", error);
      return;
    }

    // イベントタイプマスタの情報をマージ
    if (data) {
      const eventWithName = {
        ...data,
        event_name: (data.event_types as { name: string } | null)?.name || "",
        target_graduation_year: (data.event_types as { target_graduation_year: number | null } | null)?.target_graduation_year || null,
        area: (data.event_types as { area: string | null } | null)?.area || null,
      };
      setEvent(eventWithName as Event);
    }
  }, [eventId]);

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("event_reservations")
        .select(
          `
          *,
          candidates (
            phone,
            school_name,
            gender,
            profiles!profiles_candidate_id_fkey(email, last_name, first_name, last_name_kana, first_name_kana)
          )
        `
        )
        .eq("event_id", eventId);

      if (error) {
        console.error("予約取得エラー:", error);
        return;
      }

      const formattedData = formatReservationData(
        (data || []) as ReservationWithCandidate[]
      );
      const sortedData = sortReservations(formattedData);
      setReservations(sortedData);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  return {
    event,
    reservations,
    isLoading,
    fetchEvent,
    fetchReservations,
  };
}

