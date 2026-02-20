-- session_reservationsテーブルを日程ベース（session_date_id）に作り変える
-- 既存のテーブルを削除して再作成

-- 既存のテーブルを削除
DROP TABLE IF EXISTS session_reservations CASCADE;

-- 新しいsession_reservationsテーブルを作成（session_date_idベース）
CREATE TABLE session_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date_id uuid NOT NULL REFERENCES session_dates(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'reserved',
  attended boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_date_id, candidate_id)
);

-- インデックスを作成
CREATE INDEX idx_session_reservations_session_date_id ON session_reservations(session_date_id);
CREATE INDEX idx_session_reservations_candidate_id ON session_reservations(candidate_id);
CREATE INDEX idx_session_reservations_status ON session_reservations(status);

-- RLSを有効化
ALTER TABLE session_reservations ENABLE ROW LEVEL SECURITY;

-- 企業ユーザーが自分の企業の説明会の予約を閲覧できるポリシー
CREATE POLICY "Company users can view their company session reservations"
  ON session_reservations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      INNER JOIN session_dates ON session_dates.session_id = sessions.id
      WHERE profiles.id = auth.uid()
      AND session_dates.id = session_reservations.session_date_id
    )
  );

-- 企業ユーザーが自分の企業の説明会の予約を作成できるポリシー
CREATE POLICY "Company users can insert their company session reservations"
  ON session_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      INNER JOIN session_dates ON session_dates.session_id = sessions.id
      WHERE profiles.id = auth.uid()
      AND session_dates.id = session_reservations.session_date_id
    )
  );

-- 企業ユーザーが自分の企業の説明会の予約を更新できるポリシー
CREATE POLICY "Company users can update their company session reservations"
  ON session_reservations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      INNER JOIN session_dates ON session_dates.session_id = sessions.id
      WHERE profiles.id = auth.uid()
      AND session_dates.id = session_reservations.session_date_id
    )
  );

-- 候補者が自分の予約を閲覧できるポリシー
CREATE POLICY "Candidates can view their own reservations"
  ON session_reservations FOR SELECT
  TO authenticated
  USING (candidate_id = auth.uid());

-- 候補者が予約を作成できるポリシー（公開）
CREATE POLICY "Anyone can create reservations"
  ON session_reservations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 候補者が自分の予約をキャンセルできるポリシー
CREATE POLICY "Candidates can cancel their own reservations"
  ON session_reservations FOR UPDATE
  TO authenticated
  USING (candidate_id = auth.uid())
  WITH CHECK (candidate_id = auth.uid());

