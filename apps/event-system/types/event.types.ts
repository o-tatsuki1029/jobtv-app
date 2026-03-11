import type { Database, TablesInsert } from "@jobtv-app/shared/types";

export type Event = Database["public"]["Tables"]["events"]["Row"];

type EventInsert = TablesInsert<"events">;
export type EventFormData = Omit<EventInsert, "id" | "created_at" | "updated_at">;

// event_typesを含むEvent型（JOINクエリの結果用）
export type EventWithEventType = Event & {
  event_types: Database["public"]["Tables"]["event_types"]["Row"] | null;
};
