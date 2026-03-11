import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@jobtv-app/shared/supabase/admin";
import { Event } from "@/types/event.types";
import { logger } from "@/lib/logger";

type EventWithName = Event & {
  event_name: string;
  event_area: string;
};

export async function getCandidateEvents(candidateId?: string | null) {
  // candidateIdが指定されている場合は通常のクライアントを使用（RLSポリシーで自分の予約のみアクセス可能）
  // 指定されていない場合は管理者クライアントを使用（ログイン前の全イベント取得）
  const supabase = candidateId ? await createClient() : getAdminClient();

  let events: EventWithName[] = [];

  if (candidateId) {
    // candidateIdが指定されている場合、学生が出席登録したイベントを取得
    const { data, error } = await supabase
      .from("event_reservations")
      .select(
        `
        event_id,
        events (
          id,
          event_date,
          start_time,
          end_time,
          event_type_id,
          event_types (
            name,
            area
          ),
          created_at,
          updated_at
        )
      `
      )
      .eq("candidate_id", candidateId)
      .eq("attended", true);

    if (error) {
      logger.error({ action: "getCandidateEvents", err: error, candidateId }, "イベント予約の取得に失敗しました");
      throw new Error(
        `イベントの取得に失敗しました: ${error.message || "不明なエラー"}`
      );
    }

    // データを整形（eventsテーブルのデータを抽出）
    type EventWithType = {
      id: string;
      event_date: string;
      start_time: string;
      end_time: string;
      event_type_id?: string | null;
      event_types?: { name: string; area: string | null } | { name: string; area: string | null }[] | null;
      created_at: string | null;
      updated_at: string | null;
    };
    type ReservationItem = { 
      events: EventWithType | EventWithType[] | null;
    };
    events = (data || [])
      .map((item: ReservationItem) => {
        if (!item.events) return null;
        // 配列の場合は最初の要素を取得、オブジェクトの場合はそのまま
        const event = Array.isArray(item.events) ? item.events[0] : item.events;
        if (!event) return null;
        
        // event_typesからevent_nameとareaを取得
        const eventType = Array.isArray(event.event_types) 
          ? event.event_types[0] 
          : event.event_types;
        const eventName = eventType?.name || "";
        const eventArea = eventType?.area || "";
        
        return {
          id: event.id,
          event_name: eventName,
          event_date: event.event_date,
          start_time: event.start_time,
          end_time: event.end_time,
          event_area: eventArea,
          event_type_id: event.event_type_id ?? null,
          created_at: event.created_at ?? null,
          created_by: null as string | null,
          updated_at: event.updated_at ?? null,
        };
      })
      .filter((event): event is EventWithName => event !== null);
  } else {
    // candidateIdが指定されていない場合、すべてのイベントを取得（ログイン前の学生ログインページ用）
    const { data, error } = await supabase
      .from("events")
      .select(`
        id, 
        event_date, 
        start_time, 
        end_time, 
        event_type_id,
        event_types (
          name,
          area
        ),
        created_at, 
        updated_at
      `);

    if (error) {
      logger.error({ action: "getCandidateEvents", err: error }, "全イベントの取得に失敗しました");
      throw new Error(
        `イベントの取得に失敗しました: ${error.message || "不明なエラー"}`
      );
    }

    // データを整形（event_typesからevent_nameとareaを取得）
    type EventData = {
      id: string;
      event_date: string;
      start_time: string;
      end_time: string;
      event_type_id?: string | null;
      event_types?: { name: string; area: string | null } | { name: string; area: string | null }[] | null;
      created_at: string | null;
      updated_at: string | null;
    };
    events = (data || []).map((event: EventData) => {
      const eventType = Array.isArray(event.event_types) 
        ? event.event_types[0] 
        : event.event_types;
      const eventName = eventType?.name || "";
      const eventArea = eventType?.area || "";
      
      return {
        id: event.id,
        event_name: eventName,
        event_date: event.event_date,
        start_time: event.start_time,
        end_time: event.end_time,
        event_area: eventArea,
        event_type_id: event.event_type_id ?? null,
        created_at: event.created_at ?? null,
        created_by: null as string | null,
        updated_at: event.updated_at ?? null,
      };
    });
  }

  // イベント日付で降順にソート
  events.sort((a: EventWithName, b: EventWithName) => {
    const dateA = new Date(a.event_date).getTime();
    const dateB = new Date(b.event_date).getTime();
    return dateB - dateA;
  });

  return { events };
}

