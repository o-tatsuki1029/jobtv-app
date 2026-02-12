-- sessionsテーブルを作成
-- 説明会管理用のテーブル

-- session_status enum型を作成
CREATE TYPE session_status AS ENUM ('pending', 'active', 'closed');

-- sessionsテーブルを作成
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  event_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  location_type text,
  location_detail text,
  capacity integer NOT NULL,
  status session_status NOT NULL DEFAULT 'pending'::session_status,
  cover_image_url text,
  description text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_sessions_company_id ON sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_event_date ON sessions(event_date);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- RLSを有効化
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 企業ユーザーが自分の企業の説明会を閲覧できるポリシー
CREATE POLICY "Company users can view their company sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions.company_id
    )
  );

-- 企業ユーザーが自分の企業の説明会を作成できるポリシー
CREATE POLICY "Company users can insert their company sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions.company_id
    )
  );

-- 企業ユーザーが自分の企業の説明会を更新できるポリシー
CREATE POLICY "Company users can update their company sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions.company_id
    )
  );

-- 企業ユーザーが自分の企業の説明会を削除できるポリシー
CREATE POLICY "Company users can delete their company sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions.company_id
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- コメントを追加
COMMENT ON TABLE sessions IS '説明会・イベント管理テーブル';
COMMENT ON COLUMN sessions.title IS 'タイトル';
COMMENT ON COLUMN sessions.type IS '種類（勉強会、説明会、セミナー、その他）';
COMMENT ON COLUMN sessions.event_date IS '開催日';
COMMENT ON COLUMN sessions.start_time IS '開始時間';
COMMENT ON COLUMN sessions.end_time IS '終了時間';
COMMENT ON COLUMN sessions.location_type IS '場所タイプ（オンライン、オフライン、ハイブリッド）';
COMMENT ON COLUMN sessions.location_detail IS '場所詳細';
COMMENT ON COLUMN sessions.capacity IS '定員';
COMMENT ON COLUMN sessions.status IS 'ステータス（pending: 審査中、active: 公開中、closed: 終了）';
COMMENT ON COLUMN sessions.cover_image_url IS 'カバー画像URL';
COMMENT ON COLUMN sessions.description IS '説明文';

