import { createClient } from "@/lib/supabase/client";
import type { EventFilter } from "@/components/ui/table/EventFilters";

/**
 * フィルター条件をクエリに適用する関数
 * 注意: areaとtarget_graduation_yearはイベントタイプマスタから取得するため、
 * クライアント側でフィルタリングする（データベース側では日付のみフィルタリング）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyFilters(query: any, filters: EventFilter): any {
  let filteredQuery = query;

  // areaとtarget_graduation_yearはクライアント側でフィルタリングするため、
  // データベース側では日付のみフィルタリング
  if (filters.dateFrom) {
    filteredQuery = filteredQuery.gte("event_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    filteredQuery = filteredQuery.lte("event_date", filters.dateTo);
  }

  return filteredQuery;
}


/**
 * イベントデータ取得用のクエリを構築
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildEventDataQuery(
  filters: EventFilter,
  sortKey: string,
  sortAsc: boolean,
  isCountSort: boolean
): any {
  const supabase = createClient();
  // event_type_idからイベント名、卒年度、エリアを取得するためにJOIN
  let query = supabase
    .from("events")
    .select(
      `
      *,
      event_types (
        name,
        target_graduation_year,
        area
      )
    `,
      { count: "exact" }
    );

  // フィルター条件を適用
  query = applyFilters(query, filters);

  // カウント項目でない場合はDB側でソート
  if (!isCountSort) {
    query = query.order(sortKey, { ascending: sortAsc });
  }

  return query;
}

