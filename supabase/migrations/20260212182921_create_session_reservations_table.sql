-- session_reservationsテーブルを作成
-- 説明会の予約管理用テーブル

CREATE TABLE IF NOT EXISTS session_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'reserved',
  attended boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(session_id, candidate_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_session_reservations_session_id ON session_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reservations_candidate_id ON session_reservations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_session_reservations_status ON session_reservations(status);

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
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_reservations.session_id
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
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_reservations.session_id
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
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_reservations.session_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_reservations.session_id
    )
  );

-- 企業ユーザーが自分の企業の説明会の予約を削除できるポリシー
CREATE POLICY "Company users can delete their company session reservations"
  ON session_reservations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_reservations.session_id
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_session_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_reservations_updated_at
  BEFORE UPDATE ON session_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_session_reservations_updated_at();

-- コメントを追加
COMMENT ON TABLE session_reservations IS '説明会予約管理テーブル';
COMMENT ON COLUMN session_reservations.session_id IS '説明会ID';
COMMENT ON COLUMN session_reservations.candidate_id IS '候補者ID';
COMMENT ON COLUMN session_reservations.status IS '予約ステータス（reserved: 予約済み、cancelled: キャンセル）';
COMMENT ON COLUMN session_reservations.attended IS '参加有無';

