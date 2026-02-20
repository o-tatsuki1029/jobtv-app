/**
 * データベース型の拡張定義
 * Supabaseの自動生成型から派生した拡張型を定義
 * 共通の拡張型を全アプリで使用できるようにする
 */

import type { Tables } from "./database.types";

// 基本的なテーブル型
export type Profile = Tables<"profiles">;
export type Candidate = Tables<"candidates">;
export type Company = Tables<"companies">;
export type JobPosting = Tables<"job_postings">;
export type Application = Tables<"applications">;
export type ApplicationProgress = Tables<"application_progress">;
export type CAInterview = Tables<"ca_interviews">;

// 拡張型（リレーションを含む）
export interface CandidateWithProfile extends Candidate {
  assigned_to_profile?: Pick<Profile, "id" | "full_name" | "email"> | null;
}

export interface JobPostingWithCompany extends JobPosting {
  companies: Pick<Company, "id" | "name">;
}

export interface ApplicationWithRelations extends Application {
  job_postings: JobPostingWithCompany | null;
  candidates?: Candidate | null;
}

export interface ProgressItemWithRelations extends ApplicationProgress {
  application: {
    id: string;
    job_postings: JobPostingWithCompany | null;
  };
  profiles: Profile | null;
  updatedByProfile: Profile | null;
  // オプショナルフィールド（データベースに存在する可能性があるが型定義に含まれていない）
  interview_date?: string | null;
  interview_location?: string | null;
}

export interface InterviewNoteWithRelations extends CAInterview {
  type: "interview_note";
  interviewer?: Profile | null;
  interviewerProfile?: Profile | null;
  profiles?: Profile | null;
  createdByProfile?: Profile | null;
  updatedByProfile?: Profile | null;
}

// 後方互換性のためのエイリアス
export type InterviewNote = CAInterview;




