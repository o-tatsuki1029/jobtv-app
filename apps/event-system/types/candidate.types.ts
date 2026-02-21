import { Database, TablesInsert } from "@jobtv-app/shared/types";

// candidates テーブルの型定義
export type Candidate = Database["public"]["Tables"]["candidates"]["Row"];

/** 一覧取得時など profiles から join した email を含む型 */
export type CandidateWithEmail = Candidate & { email?: string | null };

type CandidateInsert = TablesInsert<"candidates">;
export type CandidateFormData = Omit<CandidateInsert, "id" | "created_at" | "updated_at" | "assigned_to" | "profile_id" | "full_name" | "notes">;

/** フォーム用（メールは profiles で管理するがUIで編集するため含む） */
export type CandidateFormDataWithEmail = CandidateFormData & { email?: string | null };

// 後方互換性のため、JobSeeker型もエクスポート（非推奨）
/** @deprecated Use Candidate instead */
export type JobSeeker = Candidate;
/** @deprecated Use CandidateFormData instead */
export type JobSeekerFormData = CandidateFormData;

