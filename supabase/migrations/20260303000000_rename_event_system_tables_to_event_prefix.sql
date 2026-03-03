-- イベントシステム用テーブルに event_ プレフィックスを付与
-- FK・インデックス・制約・RLS・トリガーはテーブルに紐づくため自動で移る

ALTER TABLE public.matching_sessions RENAME TO event_matching_sessions;
ALTER TABLE public.ratings_recruiter_to_candidate RENAME TO event_ratings_recruiter_to_candidate;
ALTER TABLE public.ratings_candidate_to_company RENAME TO event_ratings_candidate_to_company;

-- トリガー名を新テーブル名に合わせてリネーム
ALTER TRIGGER update_matching_sessions_updated_at ON public.event_matching_sessions
  RENAME TO update_event_matching_sessions_updated_at;
