"use server";

import type { TablesInsert } from "@jobtv-app/shared/types";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

export type SessionData = Partial<TablesInsert<"sessions">> & { id?: string };

/**
 * 説明会一覧を取得
 */
export async function getSessions() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select(
      `
      *,
      companies (
        id,
        name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getSessions", err: error }, "説明会一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 説明会を取得
 */
export async function getSession(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.from("sessions").select("*").eq("id", id).single();

  if (error) {
    logger.error({ action: "getSession", err: error, sessionId: id }, "説明会の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * 説明会のステータスを更新（審査承認・却下）
 */
export async function updateSessionStatus(id: string, status: "active" | "closed" | "pending") {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sessions")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    logger.error({ action: "updateSessionStatus", err: error, sessionId: id, status }, "説明会ステータスの更新に失敗しました");
    return { data: null, error: error.message };
  }

  revalidatePath("/admin/sessions");
  return { data, error: null };
}

/**
 * 説明会を承認（pending → active）
 */
export async function approveSession(id: string) {
  return updateSessionStatus(id, "active");
}

/**
 * 説明会を却下（pending → closed）
 */
export async function rejectSession(id: string) {
  return updateSessionStatus(id, "closed");
}

