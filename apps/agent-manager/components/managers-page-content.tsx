import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ManagersList } from "@/components/managers-list";
import { AdminLayoutAuth } from "@/components/admin-layout-auth";
import type { Tables } from "@jobtv-app/shared/types";

type Manager = Tables<"profiles">;

export async function ManagersPageContent() {
  // Supabase認証を使用して認証チェック
  const user = await AdminLayoutAuth();

  // 管理者権限チェック（通常のクライアントを使用してプロファイル情報を取得）
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.sub)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    redirect("/admin");
  }

  if (!profile || profile.role !== "admin") {
    redirect("/admin");
  }

  // サーバーコンポーネントで管理者データをフェッチ
  const { data: managers, error: managersError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, role")
    .in("role", ["admin", "RA", "CA", "MRK"])
    .order("last_name")
    .order("first_name")
    .order("email");

  if (managersError) {
    console.error("Error fetching managers:", managersError);
  }

  return <ManagersList managers={(managers as Manager[]) || []} />;
}
