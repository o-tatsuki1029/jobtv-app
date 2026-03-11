"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { downloadCSVAsShiftJIS } from "@/utils/data/csv";
import Button from "../Button";
import type { EventFilter } from "@/components/ui/table/EventFilters";

type EventCSVExportProps = {
  filters: EventFilter;
  sortKey: string;
  sortAsc: boolean;
};

export default function EventCSVExport({
  filters,
  sortKey,
  sortAsc,
}: EventCSVExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const supabase = createClient();

      // イベントタイプマスタを取得
      const { data: eventTypes, error: eventTypesError } = await supabase
        .from("event_types")
        .select("*");

      if (eventTypesError) {
        console.error("イベントタイプ取得エラー:", eventTypesError);
        alert("エクスポートに失敗しました: " + eventTypesError.message);
        return;
      }

      const eventTypeMap = new Map(
        (eventTypes || []).map((et) => [et.id, et])
      );

      // 検索条件に合う全データを取得（ページネーションなし）
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
        `
        );

      // 日付フィルターを適用
      if (filters.dateFrom) {
        query = query.gte("event_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("event_date", filters.dateTo);
      }

      const { data, error } = await query.order(sortKey, {
        ascending: sortAsc,
      });

      if (error) {
        console.error("エクスポートエラー:", error);
        alert("エクスポートに失敗しました: " + error.message);
        return;
      }

      if (!data || data.length === 0) {
        alert("エクスポートするデータがありません");
        return;
      }

      // クライアント側でエリアと卒年度のフィルターを適用
      type EventWithMaster = {
        id: string;
        event_date: string;
        start_time: string;
        end_time: string;
        event_types: {
          name: string;
          target_graduation_year: number | null;
          area: string | null;
        } | null;
      };
      
      let filteredData = (data || []) as EventWithMaster[];
      if (filters.area) {
        filteredData = filteredData.filter((event: EventWithMaster) => {
          const eventType = event.event_types;
          return eventType?.area === filters.area;
        });
      }
      if (filters.graduationYear !== "") {
        filteredData = filteredData.filter((event: EventWithMaster) => {
          const eventType = event.event_types;
          return (
            String(eventType?.target_graduation_year) === filters.graduationYear
          );
        });
      }

      // CSVヘッダー
      const headers = [
        "イベント名",
        "対象卒年度",
        "エリア",
        "イベント日",
        "開始時刻",
        "終了時刻",
      ];

      // CSVデータ行
      const rows = filteredData.map((event: EventWithMaster) => {
        const eventType = event.event_types;
        return [
          eventType?.name || "",
          eventType?.target_graduation_year || "",
          eventType?.area || "",
          event.event_date || "",
          event.start_time || "",
          event.end_time || "",
        ];
      });

      // SHIFT-JISでダウンロード
      await downloadCSVAsShiftJIS(
        headers,
        rows,
        `events_${new Date().toISOString().split("T")[0]}.csv`
      );
    } catch (error) {
      console.error("エクスポートエラー:", error);
      alert("エクスポートに失敗しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="success"
      size="lg"
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? "エクスポート中..." : "CSVエクスポート"}
    </Button>
  );
}

