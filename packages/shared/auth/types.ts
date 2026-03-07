/**
 * 認証関連の型定義
 */

export type UserRole = "admin" | "recruiter" | "candidate";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "管理者",
  recruiter: "企業担当者",
  candidate: "学生",
} as const;

export interface UserInfo {
  role: UserRole;
  userId: string;
  email: string | undefined;
  recruiterId?: string;
  companyId?: string;
  candidateId?: string;
  isAdmin: boolean;
}
