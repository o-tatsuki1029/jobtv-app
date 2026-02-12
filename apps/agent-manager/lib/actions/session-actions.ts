"use server";

import { createClient } from "@/lib/supabase/server";
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
    console.error("Get sessions error:", error);
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
    console.error("Get session error:", error);
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
    console.error("Update session status error:", error);
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

