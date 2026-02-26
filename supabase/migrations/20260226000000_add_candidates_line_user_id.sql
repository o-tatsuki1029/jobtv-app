-- candidates: LINE Login で取得した userId を保存（連携済みの場合のみ）
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS line_user_id text UNIQUE;

COMMENT ON COLUMN public.candidates.line_user_id IS 'LINE Login で取得した userId。連携済みの場合のみ設定。';

-- 配信時の検索用インデックス（line_user_id が NULL でない行のみ）
CREATE INDEX IF NOT EXISTS idx_candidates_line_user_id
  ON public.candidates(line_user_id)
  WHERE line_user_id IS NOT NULL;
