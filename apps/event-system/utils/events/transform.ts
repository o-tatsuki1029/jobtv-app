/**
 * イベントデータの変換処理
 */

import type { Event } from "@/types/event.types";

type RawEventData = {
  id: string;
  event_date: string;
  event_type_id: string | null;
  event_types: {
    name: string;
    target_graduation_year: number | null;
    area: string | null;
  } | null;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

/**
 * 生データからイベント名、卒年度、エリアを抽出してマッピング
 */
export function transformEventData(rawData: RawEventData[]) {
  return rawData.map((event) => ({
    ...event,
    event_name: event.event_types?.name || "",
    target_graduation_year: event.event_types?.target_graduation_year || null,
    area: event.event_types?.area || null,
  }));
}

/**
 * クライアント側でフィルターを適用
 */
export function applyClientFilters<T extends { area?: string | null; target_graduation_year?: number | null }>(
  events: T[],
  filters: { area?: string; graduationYear?: string | number }
): T[] {
  let filtered = events;

  if (filters.area) {
    filtered = filtered.filter((event) => event.area === filters.area);
  }

  if (filters.graduationYear !== undefined && filters.graduationYear !== "") {
    const graduationYearNum = typeof filters.graduationYear === "string" 
      ? Number(filters.graduationYear) 
      : filters.graduationYear;
    filtered = filtered.filter(
      (event) => event.target_graduation_year === graduationYearNum
    );
  }

  return filtered;
}

