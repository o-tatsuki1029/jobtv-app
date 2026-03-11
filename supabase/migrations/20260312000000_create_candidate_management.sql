-- 1. テーブル作成
CREATE TABLE public.candidate_management (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid UNIQUE NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  notes        text,
  assigned_to  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. インデックス
CREATE INDEX idx_candidate_management_candidate_id ON public.candidate_management(candidate_id);
CREATE INDEX idx_candidate_management_assigned_to ON public.candidate_management(assigned_to);

-- 3. updated_at トリガー
CREATE TRIGGER set_candidate_management_updated_at
  BEFORE UPDATE ON public.candidate_management
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. バックフィル（notes または assigned_to がある候補者のみ）
INSERT INTO public.candidate_management (candidate_id, notes, assigned_to)
SELECT id, notes, assigned_to
FROM public.candidates
WHERE notes IS NOT NULL OR assigned_to IS NOT NULL;

-- 5. RLS 有効化・ポリシー設定
ALTER TABLE public.candidate_management ENABLE ROW LEVEL SECURITY;

-- admins / recruiters は全レコード読み書き可
CREATE POLICY "recruiters_full_access" ON public.candidate_management
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'recruiter')
    )
  );

-- candidates は自分のレコードのみ読み取り可
CREATE POLICY "candidates_read_own" ON public.candidate_management
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.candidate_id = candidate_management.candidate_id
    )
  );

-- 6. candidates から削除
ALTER TABLE public.candidates DROP COLUMN assigned_to;
ALTER TABLE public.candidates DROP COLUMN notes;
