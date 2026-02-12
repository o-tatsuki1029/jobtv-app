-- Draftテーブルを作成
-- 審査前の状態を保持するためのテーブル

-- 1. job_postings_draftテーブルを作成
CREATE TABLE IF NOT EXISTS job_postings_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  employment_type text,
  prefecture text,
  location_detail text,
  graduation_year integer NOT NULL,
  requirements text,
  benefits text,
  selection_process text,
  cover_image_url text,
  available_statuses application_status[] NOT NULL DEFAULT ARRAY['applied'::application_status, 'offer'::application_status, 'rejected'::application_status, 'withdrawn'::application_status]::application_status[],
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- draft専用カラム
  draft_status text NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  production_job_id uuid REFERENCES job_postings(id) ON DELETE SET NULL
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_job_postings_draft_company_id ON job_postings_draft(company_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_draft_status ON job_postings_draft(draft_status);
CREATE INDEX IF NOT EXISTS idx_job_postings_draft_production_job_id ON job_postings_draft(production_job_id);

-- RLSを有効化
ALTER TABLE job_postings_draft ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のdraftを閲覧・作成・更新できる
CREATE POLICY "Company users can view their company job drafts"
  ON job_postings_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings_draft.company_id
    )
  );

CREATE POLICY "Company users can insert their company job drafts"
  ON job_postings_draft FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings_draft.company_id
    )
  );

CREATE POLICY "Company users can update their company job drafts"
  ON job_postings_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings_draft.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings_draft.company_id
    )
  );

CREATE POLICY "Company users can delete their company job drafts"
  ON job_postings_draft FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings_draft.company_id
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_job_postings_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_postings_draft_updated_at
  BEFORE UPDATE ON job_postings_draft
  FOR EACH ROW
  EXECUTE FUNCTION update_job_postings_draft_updated_at();

-- 2. sessions_draftテーブルを作成
CREATE TABLE IF NOT EXISTS sessions_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  location_type text,
  location_detail text,
  capacity integer,
  description text NOT NULL,
  cover_image_url text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- draft専用カラム
  draft_status text NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  production_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_sessions_draft_company_id ON sessions_draft(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_draft_status ON sessions_draft(draft_status);
CREATE INDEX IF NOT EXISTS idx_sessions_draft_production_session_id ON sessions_draft(production_session_id);

-- RLSを有効化
ALTER TABLE sessions_draft ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のdraftを閲覧・作成・更新できる
CREATE POLICY "Company users can view their company session drafts"
  ON sessions_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions_draft.company_id
    )
  );

CREATE POLICY "Company users can insert their company session drafts"
  ON sessions_draft FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions_draft.company_id
    )
  );

CREATE POLICY "Company users can update their company session drafts"
  ON sessions_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions_draft.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions_draft.company_id
    )
  );

CREATE POLICY "Company users can delete their company session drafts"
  ON sessions_draft FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = sessions_draft.company_id
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_sessions_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_draft_updated_at
  BEFORE UPDATE ON sessions_draft
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_draft_updated_at();

-- 3. companies_draftテーブルを作成
CREATE TABLE IF NOT EXISTS companies_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text,
  description text,
  company_info text,
  logo_url text,
  cover_image_url text,
  website text,
  address_line1 text,
  address_line2 text,
  established text,
  employees text,
  representative text,
  industry text,
  location text,
  benefits text[],
  company_videos jsonb,
  documentary_videos jsonb,
  short_videos jsonb,
  main_video_url text,
  sns_x_url text,
  sns_instagram_url text,
  sns_tiktok_url text,
  sns_youtube_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- draft専用カラム
  draft_status text NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'rejected'
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  production_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE -- どの企業のdraftか
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_companies_draft_company_id ON companies_draft(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_draft_status ON companies_draft(draft_status);
CREATE INDEX IF NOT EXISTS idx_companies_draft_production_company_id ON companies_draft(production_company_id);

-- RLSを有効化
ALTER TABLE companies_draft ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のdraftを閲覧・作成・更新できる
CREATE POLICY "Company users can view their company drafts"
  ON companies_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = companies_draft.company_id
    )
  );

CREATE POLICY "Company users can insert their company drafts"
  ON companies_draft FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = companies_draft.company_id
    )
  );

CREATE POLICY "Company users can update their company drafts"
  ON companies_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = companies_draft.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = companies_draft.company_id
    )
  );

CREATE POLICY "Company users can delete their company drafts"
  ON companies_draft FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = companies_draft.company_id
    )
  );

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_companies_draft_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_draft_updated_at
  BEFORE UPDATE ON companies_draft
  FOR EACH ROW
  EXECUTE FUNCTION update_companies_draft_updated_at();

-- コメントを追加
COMMENT ON TABLE job_postings_draft IS '求人の下書きテーブル（審査前の状態を保持）';
COMMENT ON TABLE sessions_draft IS '説明会の下書きテーブル（審査前の状態を保持）';
COMMENT ON TABLE companies_draft IS '企業情報の下書きテーブル（審査前の状態を保持）';

COMMENT ON COLUMN job_postings_draft.draft_status IS '下書きステータス（draft: 編集中、submitted: 審査申請済み、approved: 承認済み、rejected: 却下済み）';
COMMENT ON COLUMN sessions_draft.draft_status IS '下書きステータス（draft: 編集中、submitted: 審査申請済み、approved: 承認済み、rejected: 却下済み）';
COMMENT ON COLUMN companies_draft.draft_status IS '下書きステータス（draft: 編集中、submitted: 審査申請済み、approved: 承認済み、rejected: 却下済み）';

