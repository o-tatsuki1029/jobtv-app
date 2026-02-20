import type { UserRole } from "@jobtv-app/shared/auth/types";

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

