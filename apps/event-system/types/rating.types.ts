import { Database, TablesInsert, TablesUpdate } from "@jobtv-app/shared/types";

// event_ratings_recruiter_to_candidate テーブル（旧名：ratings_recruiter_to_jobseeker）
export type Rating = Database["public"]["Tables"]["event_ratings_recruiter_to_candidate"]["Row"];

export type RatingInsert = TablesInsert<"event_ratings_recruiter_to_candidate">;

export type RatingUpdate = TablesUpdate<"event_ratings_recruiter_to_candidate">;

export type RatingFormData = {
  company_id: string;
  candidate_id: string;
  overall_rating: number | null;
  logic_rating: number | null;
  initiative_rating: number | null;
  cooperation_rating: number | null;
};

export type RatingGrade = "S" | "A" | "B" | "C";

export const RATING_GRADE_MAP: Record<RatingGrade, number> = {
  S: 4,
  A: 3,
  B: 2,
  C: 1,
};

export const RATING_NUMBER_MAP: Record<number, RatingGrade> = {
  4: "S",
  3: "A",
  2: "B",
  1: "C",
};


