"use server";

import { logger } from "@/lib/logger";
import { supabaseSelect } from "./supabase-actions";
import { Database } from "@/types";

type EventArea = Database["public"]["Tables"]["event_areas"]["Row"];
type EventGraduationYear = Database["public"]["Tables"]["event_graduation_years"]["Row"];
type EventType = Database["public"]["Tables"]["event_types"]["Row"];

/**
 * エリアマスタを取得（すべて取得、is_activeに関係なく）
 */
export async function getEventAreas(): Promise<EventArea[]> {
  const { data, error } = await supabaseSelect<"event_areas">("event_areas");

  if (error || !data) {
    logger.error({ action: "getEventAreas", err: error }, "エリアマスタの取得に失敗しました");
    return [];
  }

  // エリア名でソート
  return data.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * 卒年度マスタを取得（すべて取得、is_activeに関係なく）
 */
export async function getEventGraduationYears(): Promise<EventGraduationYear[]> {
  const { data, error } = await supabaseSelect<"event_graduation_years">(
    "event_graduation_years"
  );

  if (error || !data) {
    logger.error({ action: "getEventGraduationYears", err: error }, "卒年度マスタの取得に失敗しました");
    return [];
  }

  // 卒年度でソート
  return data.sort((a, b) => a.year - b.year);
}

/**
 * イベントタイプマスタを取得（すべて取得、is_activeに関係なく）
 */
export async function getEventTypes(): Promise<EventType[]> {
  const { data, error } = await supabaseSelect<"event_types">(
    "event_types"
  );

  if (error || !data) {
    logger.error({ action: "getEventTypes", err: error }, "イベントタイプマスタの取得に失敗しました");
    return [];
  }

  // イベント名でソート
  return data.sort((a, b) => a.name.localeCompare(b.name));
}

