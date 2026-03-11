import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Event } from "@/types/event.types";
import {
  formatEventCompanyData,
  type EventCompany,
  type EventCompanyWithRelation,
} from "@/utils/events/company";

type UseEventCompaniesReturn = {
  event: Event | null;
  eventCompanies: EventCompany[];
  isLoading: boolean;
  fetchEvent: () => Promise<void>;
  fetchEventCompanies: () => Promise<void>;
};

/**
 * イベント企業データ管理のカスタムフック
 */
export function useEventCompanies(
  eventId: string
): UseEventCompaniesReturn {
  const [event, setEvent] = useState<Event | null>(null);
  const [eventCompanies, setEventCompanies] = useState<EventCompany[]>([]);
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

  const fetchEventCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("event_companies")
        .select(
          `
          *,
          companies (
            name
          )
        `
        )
        .eq("event_id", eventId);

      if (error) {
        console.error("企業取得エラー:", error);
        return;
      }

      const formattedData = formatEventCompanyData(
        (data || []) as EventCompanyWithRelation[]
      );
      setEventCompanies(formattedData);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  return {
    event,
    eventCompanies,
    isLoading,
    fetchEvent,
    fetchEventCompanies,
  };
}

