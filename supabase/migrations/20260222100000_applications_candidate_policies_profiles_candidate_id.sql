-- applications の candidate 用ポリシーを profiles.candidate_id ベースに修正
-- （candidate_id は candidates.id を指すため、auth.uid() では一致せず実質 INSERT できなかった）

DROP POLICY IF EXISTS "Candidates can insert their own applications" ON public.applications;
DROP POLICY IF EXISTS "Candidates can view their own applications" ON public.applications;

-- 候補者が自分の応募のみ閲覧可能
CREATE POLICY "Candidates can view their own applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    candidate_id = (SELECT candidate_id FROM public.profiles WHERE id = auth.uid())
  );

-- 候補者が自分用の応募のみ作成可能
CREATE POLICY "Candidates can insert their own applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    candidate_id = (
      SELECT candidate_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'candidate'
    )
  );
