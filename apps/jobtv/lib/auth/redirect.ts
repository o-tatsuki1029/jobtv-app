import type { UserRole } from "@jobtv-app/shared/auth";

/**
 * jobtv アプリ固有のリダイレクト先を取得
 * recruiter は /studio にリダイレクト
 */
export function getRedirectPathByRole(
  role: UserRole | null | undefined
): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "recruiter":
      return "/studio";
    case "candidate":
      return "/";
    default:
      return "/auth/login";
  }
}

/**
 * ロールに対応するログインページのパスを取得（ログアウト後のリダイレクト先に使用）
 */
export function getLoginPathByRole(
  role: UserRole | null | undefined
): string {
  switch (role) {
    case "admin":
      return "/admin/login";
    case "recruiter":
      return "/studio/login";
    case "candidate":
    default:
      return "/auth/login";
  }
}


