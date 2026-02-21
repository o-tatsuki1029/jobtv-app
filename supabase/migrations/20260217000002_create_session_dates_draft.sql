-- session_dates_draftテーブルを作成（ドラフト用の日程管理）
CREATE TABLE IF NOT EXISTS session_dates_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_draft_id uuid NOT NULL REFERENCES sessions_draft(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  capacity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_session_dates_draft_session_draft_id ON session_dates_draft(session_draft_id);
CREATE INDEX IF NOT EXISTS idx_session_dates_draft_event_date ON session_dates_draft(event_date);

-- RLSを有効化
ALTER TABLE session_dates_draft ENABLE ROW LEVEL SECURITY;

-- 企業ユーザーが自分の企業の説明会ドラフトの日程を閲覧できるポリシー
CREATE POLICY "Company users can view their company session dates draft"
  ON session_dates_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions_draft ON sessions_draft.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions_draft.id = session_dates_draft.session_draft_id
    )
  );

-- 企業ユーザーが自分の企業の説明会ドラフトの日程を作成できるポリシー
CREATE POLICY "Company users can insert their company session dates draft"
  ON session_dates_draft FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions_draft ON sessions_draft.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions_draft.id = session_dates_draft.session_draft_id
    )
  );

-- 企業ユーザーが自分の企業の説明会ドラフトの日程を更新できるポリシー
CREATE POLICY "Company users can update their company session dates draft"
  ON session_dates_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions_draft ON sessions_draft.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions_draft.id = session_dates_draft.session_draft_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions_draft ON sessions_draft.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions_draft.id = session_dates_draft.session_draft_id
    )
  );

-- 企業ユーザーが自分の企業の説明会ドラフトの日程を削除できるポリシー
CREATE POLICY "Company users can delete their company session dates draft"
  ON session_dates_draft FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN sessions_draft ON sessions_draft.company_id = profiles.company_id
      WHERE profiles.id = auth.uid()
      AND sessions_draft.id = session_dates_draft.session_draft_id
    )
  );

-- 管理者がすべての日程を操作できるポリシー
CREATE POLICY "Admin can manage all session dates draft"
  ON session_dates_draft FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_session_dates_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_dates_draft_updated_at
  BEFORE UPDATE ON session_dates_draft
  FOR EACH ROW
  EXECUTE FUNCTION update_session_dates_draft_updated_at();

-- コメントを追加
COMMENT ON TABLE session_dates_draft IS '説明会日程ドラフト管理テーブル';
COMMENT ON COLUMN session_dates_draft.session_draft_id IS '説明会ドラフトID';
COMMENT ON COLUMN session_dates_draft.event_date IS '開催日';
COMMENT ON COLUMN session_dates_draft.start_time IS '開始時間';
COMMENT ON COLUMN session_dates_draft.end_time IS '終了時間';
COMMENT ON COLUMN session_dates_draft.capacity IS '定員（この日程の定員、NULLの場合は説明会の定員を使用）';


