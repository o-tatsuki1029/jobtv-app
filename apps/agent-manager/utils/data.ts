/**
 * データ取得関連のユーティリティ関数（サーバー側）
 */

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@jobtv-app/shared/types";

type Company = Pick<Tables<"companies">, "id" | "name">;
type AdminUser = Pick<Tables<"profiles">, "id" | "email" | "first_name" | "last_name">;

/**
 * 企業一覧を取得（サーバー側）
 */
export async function fetchCompaniesServer(): Promise<Company[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name")
    .order("name");

  return data || [];
}

/**
 * 管理者一覧を取得（サーバー側）
 */
export async function fetchAdminUsersServer(): Promise<AdminUser[]> {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .in("role", ["admin", "RA", "CA", "MRK"])
    .order("last_name")
    .order("first_name")
    .order("email");

  return profiles || [];
}

