/**
 * 型定義の統一エクスポート
 * 共通型定義とアプリ固有型定義を統一的に参照できるようにする
 */

// 共通型定義を再エクスポート（@jobtv-app/shared/typesから）
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Json,
  Enums,
  CompositeTypes,
  Profile,
  Candidate as SharedCandidate,
  Company as SharedCompany,
  JobPosting,
  Application,
  ApplicationProgress,
  CAInterview,
  CandidateWithProfile,
  JobPostingWithCompany,
  ApplicationWithRelations,
  ProgressItemWithRelations,
  InterviewNoteWithRelations,
  InterviewNote,
} from "@jobtv-app/shared/types";

// 共通のROLE_LABELSを再エクスポート
export { ROLE_LABELS } from "@jobtv-app/shared/auth/client";

// アプリ固有型定義を再エクスポート
export type { Event, EventFormData, EventWithEventType } from "./event.types";
export type { Company, CompanyFormData } from "./company.types";
export type { Candidate, CandidateFormData, JobSeeker, JobSeekerFormData } from "./candidate.types";
export type { Rating, RatingInsert, RatingUpdate, RatingFormData, RatingGrade, RATING_GRADE_MAP, RATING_NUMBER_MAP } from "./rating.types";
export type { CommentTemplate, CommentTemplateFormData } from "./commentTemplate.types";
export type { EventReservation, EventReservationFormData } from "./eventReservation.types";
export type {
  MatchingSession,
  MatchingSessionInsert,
  MatchingSessionUpdate,
  MatchingResult,
  MatchingResultInsert,
  MatchingResultUpdate,
  SpecialInterview,
  SpecialInterviewInsert,
  SpecialInterviewUpdate,
  MatchingWeights,
  MatchScore,
  SpecialInterviewInput,
  MatchingResultRow,
  CandidateResult,
  MatchingCompany,
  MatchingCandidate,
  EvaluationStatus,
  MatchingResultData,
} from "./matching.types";

