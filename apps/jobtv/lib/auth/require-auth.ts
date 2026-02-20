import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserInfo, UserRole } from "@jobtv-app/shared/auth/types";
import { getRedirectPathByRole } from "./redirect";

/**
 * ユーザー情報を取得（内部用）
 */
async function getUserInfoInternal(): Promise<UserInfo | null> {
  const supabase = await createClient();
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  if (getUserError || !user) {
    return null;
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    return null;
  }

  const role = userProfile.role as UserRole;
  let recruiterId: string | undefined;
  let companyId: string | undefined;

  if (role === "recruiter") {
    recruiterId = user.id;
    companyId = userProfile.company_id || undefined;
  }

  return {
    role,
    userId: user.id,
    email: user.email,
    recruiterId,
    companyId,
    isAdmin: role === "admin",
  };
}

/**
 * 管理者権限をチェックし、権限がない場合はjobtvアプリ固有のパスにリダイレクト
 * 未認証の場合は管理者ログインページにリダイレクト
 */
export async function requireAdmin(): Promise<UserInfo> {
  const userInfo = await getUserInfoInternal();
  
  // 未認証の場合は管理者ログインページへ
  if (!userInfo) {
    redirect("/admin/login");
  }
  
  // admin以外のロールの場合は適切なパスへリダイレクト
  if (userInfo.role !== "admin") {
    redirect(getRedirectPathByRole(userInfo.role));
  }
  
  return userInfo;
}

/**
 * recruiterまたはadmin権限をチェック
 * 未認証の場合は通常のログインページにリダイレクト
 */
export async function requireRecruiterOrAdmin(): Promise<UserInfo> {
  const userInfo = await getUserInfoInternal();
  
  // 未認証の場合は通常のログインページへ
  if (!userInfo) {
    redirect("/auth/login");
  }
  
  // recruiterまたはadmin以外のロールの場合は適切なパスへリダイレクト
  if (userInfo.role !== "recruiter" && userInfo.role !== "admin") {
    redirect(getRedirectPathByRole(userInfo.role));
  }
  
  return userInfo;
}

