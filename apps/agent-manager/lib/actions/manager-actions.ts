"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@jobtv-app/shared/types";

export type ManagerData = Tables<"profiles">;

/**
 * 管理者一覧を取得
 */
export async function getManagers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role")
    .in("role", ["admin", "RA", "CA", "MRK"])
    .order("last_name")
    .order("first_name")
    .order("email");

  if (error) {
    console.error("Get managers error:", error);
    return { data: null, error: error.message };
  }

  return { data: (data as ManagerData[]) || [], error: null };
}

/**
 * 管理者を更新
 */
export async function updateManager(
  id: string,
  data: { 
    first_name?: string | null; 
    last_name?: string | null; 
    first_name_kana?: string | null; 
    last_name_kana?: string | null; 
    role?: string 
  },
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      first_name_kana: data.first_name_kana || null,
      last_name_kana: data.last_name_kana || null,
      role: data.role,
    })
    .eq("id", id);

  if (error) {
    console.error("Update manager error:", error);
    return { data: null, error: error.message };
  }

  return { data: { id }, error: null };
}
