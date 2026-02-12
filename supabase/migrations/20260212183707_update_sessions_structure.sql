-- sessionsテーブルの構造を変更
-- 日程を複数作成できるように、日程テーブルを分離

-- 既存のsessionsテーブルからevent_date, start_time, end_timeを削除
-- capacityをNULL許可に変更
-- descriptionをNOT NULLに変更
ALTER TABLE sessions
  DROP COLUMN IF EXISTS event_date,
  DROP COLUMN IF EXISTS start_time,
  DROP COLUMN IF EXISTS end_time,
  ALTER COLUMN capacity DROP NOT NULL,
  ALTER COLUMN description SET NOT NULL;

-- session_datesテーブルを作成（日程管理用）
CREATE TABLE IF NOT EXISTS session_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_session_dates_session_id ON session_dates(session_id);
CREATE INDEX IF NOT EXISTS idx_session_dates_event_date ON session_dates(event_date);

-- RLSを有効化
ALTER TABLE session_dates ENABLE ROW LEVEL SECURITY;

-- 企業ユーザーが自分の企業の説明会の日程を閲覧できるポリシー
CREATE POLICY "Company users can view their company session dates"
  ON session_dates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_dates.session_id
    )
  );

-- 企業ユーザーが自分の企業の説明会の日程を作成できるポリシー
CREATE POLICY "Company users can insert their company session dates"
  ON session_dates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_dates.session_id
    )
  );

-- 企業ユーザーが自分の企業の説明会の日程を更新できるポリシー
CREATE POLICY "Company users can update their company session dates"
  ON session_dates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_dates.session_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_dates.session_id
    )
  );

-- 企業ユーザーが自分の企業の説明会の日程を削除できるポリシー
CREATE POLICY "Company users can delete their company session dates"
  ON session_dates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions ON sessions.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions.id = session_dates.session_id
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_session_dates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_dates_updated_at
  BEFORE UPDATE ON session_dates
  FOR EACH ROW
  EXECUTE FUNCTION update_session_dates_updated_at();

-- コメントを追加
COMMENT ON TABLE session_dates IS '説明会日程管理テーブル';
COMMENT ON COLUMN session_dates.session_id IS '説明会ID';
COMMENT ON COLUMN session_dates.event_date IS '開催日';
COMMENT ON COLUMN session_dates.start_time IS '開始時間';
COMMENT ON COLUMN session_dates.end_time IS '終了時間';
COMMENT ON COLUMN session_dates.capacity IS '定員（この日程の定員、NULLの場合は説明会の定員を使用）';

-- sessionsテーブルのコメントを更新
COMMENT ON COLUMN sessions.capacity IS '定員（全体の定員、各日程で個別に設定することも可能）';
COMMENT ON COLUMN sessions.description IS '説明文（必須）';

