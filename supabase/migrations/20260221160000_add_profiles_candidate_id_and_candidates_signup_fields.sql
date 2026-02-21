-- profiles.candidate_id 追加（求職者と candidates 行の紐付け用）
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.candidates(id);

COMMENT ON COLUMN public.profiles.candidate_id IS '求職者本人に紐づく candidates.id。candidate ロールのときのみ設定。';

-- candidates: 学部・学科を別カラムで追加
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS faculty_name text,
  ADD COLUMN IF NOT EXISTS department_name text;

COMMENT ON COLUMN public.candidates.faculty_name IS '学部名';
COMMENT ON COLUMN public.candidates.department_name IS '学科名';

-- candidates: desired_industry を text[] に変更（既存の text のときのみ。既に text[] の場合はスキップ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'desired_industry' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS desired_industry_new text[];
    UPDATE public.candidates SET desired_industry_new = CASE WHEN desired_industry IS NULL OR trim(desired_industry) = '' THEN NULL ELSE ARRAY[desired_industry] END;
    ALTER TABLE public.candidates DROP COLUMN desired_industry;
    ALTER TABLE public.candidates RENAME COLUMN desired_industry_new TO desired_industry;
  END IF;
END $$;

-- candidates: desired_job_type を text[] に変更
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'desired_job_type' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS desired_job_type_new text[];
    UPDATE public.candidates SET desired_job_type_new = CASE WHEN desired_job_type IS NULL OR trim(desired_job_type) = '' THEN NULL ELSE ARRAY[desired_job_type] END;
    ALTER TABLE public.candidates DROP COLUMN desired_job_type;
    ALTER TABLE public.candidates RENAME COLUMN desired_job_type_new TO desired_job_type;
  END IF;
END $$;

COMMENT ON COLUMN public.candidates.desired_industry IS '興味のある業界（複数選択）';
COMMENT ON COLUMN public.candidates.desired_job_type IS '興味のある職種（複数選択）';
