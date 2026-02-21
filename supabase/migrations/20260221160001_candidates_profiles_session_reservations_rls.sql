-- ============================================
-- candidate ロールの candidates INSERT/SELECT/UPDATE 許可
-- profiles の自分用 candidate_id 更新許可
-- session_reservations の候補者用ポリシーを profiles.candidate_id ベースに変更
-- ============================================

-- candidates: 認証済みの candidate が自分用に 1 件 INSERT 可能
CREATE POLICY "Candidates can insert own row"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'candidate'
    )
  );

-- candidates: 自分の profile.candidate_id に一致する行のみ SELECT 可能
CREATE POLICY "Candidates can view own row"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.candidate_id = candidates.id
    )
  );

-- candidates: 自分の profile.candidate_id に一致する行のみ UPDATE 可能
CREATE POLICY "Candidates can update own row"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.candidate_id = candidates.id
    )
  );

-- profiles: 認証ユーザーが自分の profile を UPDATE 可能（candidate_id 設定に必要）
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- session_reservations: 候補者用 SELECT を profiles.candidate_id ベースに変更
DROP POLICY IF EXISTS "Candidates can view their own reservations" ON public.session_reservations;
CREATE POLICY "Candidates can view their own reservations"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.candidate_id = session_reservations.candidate_id
    )
  );

-- session_reservations: 候補者用 UPDATE を profiles.candidate_id ベースに変更
DROP POLICY IF EXISTS "Candidates can cancel their own reservations" ON public.session_reservations;
CREATE POLICY "Candidates can cancel their own reservations"
  ON public.session_reservations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.candidate_id = session_reservations.candidate_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.candidate_id = session_reservations.candidate_id
    )
  );
