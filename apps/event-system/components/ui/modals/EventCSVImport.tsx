"use client";

import { useCallback } from "react";
import CSVImport from "@/components/ui/csv/CSVImport";
import { EventFormData } from "@/types/event.types";
import { getEventTypes } from "@/lib/actions/masters-actions";

export default function EventCSVImport() {
  const transformRow = useCallback(
    async (row: string[]): Promise<EventFormData> => {
      const eventTypeName = row[0]?.trim() || "";
      const eventDate = row[1]?.trim() || "";
      const startTime = row[2]?.trim() || "";
      const endTime = row[3]?.trim() || "";

      if (!eventTypeName) {
        throw new Error("イベント名が空です");
      }
      if (!eventDate) {
        throw new Error("イベント日が空です");
      }
      if (!startTime) {
        throw new Error("開始時刻が空です");
      }
      if (!endTime) {
        throw new Error("終了時刻が空です");
      }

      // イベントタイプマスタからIDを取得
      const eventTypes = await getEventTypes();
      const eventType = eventTypes.find((et) => et.name === eventTypeName);

      if (!eventType) {
        throw new Error(`イベントタイプ「${eventTypeName}」が見つかりません`);
      }

      return {
        event_type_id: eventType.id,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
      };
    },
    []
  );

  const validateData = useCallback((data: EventFormData) => {
    return !!(
      data.event_type_id &&
      data.event_date &&
      data.start_time &&
      data.end_time
    );
  }, []);

  return (
    <CSVImport<EventFormData>
      tableName="events"
      inputId="event-csv-input"
      transformRow={transformRow}
      validateData={validateData}
      formatHeaders={["イベント名", "イベント日", "開始時刻", "終了時刻"]}
      formatRows={[
        ["27卒マッチングイベント", "2025-10-10", "10:00", "12:00"],
      ]}
      formatFilename="events_format.csv"
    />
  );
}
