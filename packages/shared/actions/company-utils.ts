"use server";

import { redirect } from "next/navigation";
import { getUserInfo } from "@jobtv-app/shared/auth";
import { getRedirectPathByRole } from "@jobtv-app/shared/auth";

/**
 * ログイン中のユーザーの企業IDを取得
 * - 企業ユーザー（recruiter）の場合: 自分の企業IDを返す
 * - 管理者（admin）の場合: エラーを返す（Server Actionから呼ばれる場合はリダイレクトしない）
 * - 未認証の場合: エラーを返す（Server Actionから呼ばれる場合はリダイレクトしない）
 *
 * @param shouldRedirect Server Componentから呼ばれる場合はtrue、Server Actionから呼ばれる場合はfalse（デフォルト: false）
 */
export async function getUserCompanyId(
  shouldRedirect: boolean = false
): Promise<{
  companyId: string;
  error: string | null;
}> {
  const userInfo = await getUserInfo();

  if (!userInfo) {
    if (shouldRedirect) {
      redirect("/login");
    }
    return { companyId: "", error: "認証が必要です" };
  }

  // 管理者の場合はエラーを返す（Server Actionから呼ばれる場合はリダイレクトしない）
  if (userInfo.role === "admin" || userInfo.isAdmin) {
    if (shouldRedirect) {
      redirect("/admin");
    }
    return { companyId: "", error: "管理者はこの機能を使用できません" };
  }

  // 企業ユーザーの場合
  if (userInfo.role === "recruiter") {
    if (!userInfo.companyId) {
      return { companyId: "", error: "企業IDが設定されていません" };
    }
    return { companyId: userInfo.companyId, error: null };
  }

  // その他のロールの場合
  if (shouldRedirect) {
    redirect(getRedirectPathByRole(userInfo.role));
  }
  return { companyId: "", error: "このロールはこの機能を使用できません" };
}

/**
 * 企業編集権限をチェック（シンプル版）
 * - ログイン中のユーザーの企業IDのみ編集可能
 * - 管理者はこの関数を使用しない（エラーを返す）
 */
export async function checkCompanyEditPermission(companyId: string): Promise<{
  allowed: boolean;
  error: string | null;
}> {
  const userInfo = await getUserInfo();

  if (!userInfo) {
    return { allowed: false, error: "認証が必要です" };
  }

  // 管理者の場合はエラーを返す（Server Actionから呼ばれる場合はリダイレクトしない）
  if (userInfo.role === "admin" || userInfo.isAdmin) {
    return { allowed: false, error: "管理者はこの機能を使用できません" };
  }

  // 企業ユーザーの場合
  if (userInfo.role === "recruiter") {
    if (!userInfo.companyId) {
      return { allowed: false, error: "企業IDが設定されていません" };
    }

    // 自分の企業のみ編集可能
    if (userInfo.companyId === companyId) {
      return { allowed: true, error: null };
    }

    return { allowed: false, error: "この企業の編集権限がありません" };
  }

  return { allowed: false, error: "編集権限がありません" };
}
