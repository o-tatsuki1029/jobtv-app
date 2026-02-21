import type { UserRole } from "./types";

/**
 * ロールの日本語ラベルを取得
 */
export function getRoleLabel(
  role: UserRole | string | null | undefined
): string {
  if (!role) return "";
  const ROLE_LABELS: Record<UserRole, string> = {
    admin: "管理者",
    recruiter: "企業担当者",
    candidate: "学生",
  };
  return ROLE_LABELS[role as UserRole] || role;
}

/**
 * ロールに基づいてリダイレクト先を取得
 * アプリ固有のパスが必要な場合は、各アプリでオーバーライド可能
 */
export function getRedirectPathByRole(
  role: UserRole | null | undefined
): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "recruiter":
      return "/recruiter";
    case "candidate":
      return "/candidate/rating";
    default:
      return "/login";
  }
}





