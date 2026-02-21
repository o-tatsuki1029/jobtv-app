-- candidates.email 削除（メールは profiles.email のみ使用）
DROP INDEX IF EXISTS idx_candidates_email;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS email;
