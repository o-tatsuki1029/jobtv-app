-- 企業ページの項目を別テーブルに分割
-- 設定>企業プロフィール: companiesテーブルに残す
-- 企業ページ: company_pagesテーブルに分割

-- ============================================
-- 0. draft_status型が存在しない場合は作成
-- ============================================
DO $$ BEGIN
  CREATE TYPE draft_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 1. company_pagesテーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS company_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tagline text,
  description text,
  cover_image_url text,
  main_video_url text,
  sns_x_url text,
  sns_instagram_url text,
  sns_tiktok_url text,
  sns_youtube_url text,
  short_videos jsonb DEFAULT '[]'::jsonb,
  documentary_videos jsonb DEFAULT '[]'::jsonb,
  company_videos jsonb DEFAULT '[]'::jsonb,
  benefits text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_company_pages_company_id ON company_pages(company_id);

-- RLSを有効化
ALTER TABLE company_pages ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のページ情報を閲覧・作成・更新できる
CREATE POLICY "Company users can view their company pages"
  ON company_pages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_pages.company_id
  ));

CREATE POLICY "Company users can insert their company pages"
  ON company_pages FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_pages.company_id
  ));

CREATE POLICY "Company users can update their company pages"
  ON company_pages FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_pages.company_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_pages.company_id
  ));

-- 公開ページでは誰でも閲覧可能
CREATE POLICY "Public can view company pages"
  ON company_pages FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 2. company_pages_draftテーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS company_pages_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tagline text,
  description text,
  cover_image_url text,
  main_video_url text,
  sns_x_url text,
  sns_instagram_url text,
  sns_tiktok_url text,
  sns_youtube_url text,
  short_videos jsonb DEFAULT '[]'::jsonb,
  documentary_videos jsonb DEFAULT '[]'::jsonb,
  company_videos jsonb DEFAULT '[]'::jsonb,
  benefits text[] DEFAULT ARRAY[]::text[],
  
  -- Draft specific fields
  draft_status draft_status NOT NULL DEFAULT 'draft'::draft_status,
  submitted_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejected_at timestamp with time zone,
  production_page_id uuid REFERENCES company_pages(id) ON DELETE SET NULL, -- Link to the production page
  
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_company_pages_draft_company_id ON company_pages_draft(company_id);
CREATE INDEX IF NOT EXISTS idx_company_pages_draft_draft_status ON company_pages_draft(draft_status);
CREATE INDEX IF NOT EXISTS idx_company_pages_draft_production_page_id ON company_pages_draft(production_page_id);

-- RLSを有効化
ALTER TABLE company_pages_draft ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のページdraftを閲覧・作成・更新・削除できる
CREATE POLICY "Company users can view their company_pages_draft"
  ON company_pages_draft FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = company_pages_draft.company_id));

CREATE POLICY "Company users can insert their company_pages_draft"
  ON company_pages_draft FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = company_pages_draft.company_id));

CREATE POLICY "Company users can update their company_pages_draft"
  ON company_pages_draft FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = company_pages_draft.company_id))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = company_pages_draft.company_id));

CREATE POLICY "Company users can delete their company_pages_draft"
  ON company_pages_draft FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = company_pages_draft.company_id));

-- ============================================
-- 3. 既存データをcompany_pagesテーブルに移行
-- ============================================
INSERT INTO company_pages (
  company_id,
  tagline,
  description,
  cover_image_url,
  main_video_url,
  sns_x_url,
  sns_instagram_url,
  sns_tiktok_url,
  sns_youtube_url,
  short_videos,
  documentary_videos,
  company_videos,
  benefits,
  created_at,
  updated_at
)
SELECT 
  id,
  tagline,
  description,
  cover_image_url,
  main_video_url,
  sns_x_url,
  sns_instagram_url,
  sns_tiktok_url,
  sns_youtube_url,
  COALESCE(short_videos, '[]'::jsonb),
  COALESCE(documentary_videos, '[]'::jsonb),
  COALESCE(company_videos, '[]'::jsonb),
  COALESCE(benefits, ARRAY[]::text[]),
  created_at,
  updated_at
FROM companies
WHERE tagline IS NOT NULL 
   OR description IS NOT NULL 
   OR cover_image_url IS NOT NULL 
   OR main_video_url IS NOT NULL 
   OR sns_x_url IS NOT NULL 
   OR sns_instagram_url IS NOT NULL 
   OR sns_tiktok_url IS NOT NULL 
   OR sns_youtube_url IS NOT NULL 
   OR short_videos IS NOT NULL 
   OR documentary_videos IS NOT NULL 
   OR company_videos IS NOT NULL 
   OR benefits IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

-- ============================================
-- 4. companies_draftからcompany_pages_draftにデータを移行
-- ============================================
INSERT INTO company_pages_draft (
  company_id,
  tagline,
  description,
  cover_image_url,
  main_video_url,
  sns_x_url,
  sns_instagram_url,
  sns_tiktok_url,
  sns_youtube_url,
  short_videos,
  documentary_videos,
  company_videos,
  benefits,
  draft_status,
  submitted_at,
  approved_at,
  rejected_at,
  production_page_id,
  created_by,
  created_at,
  updated_at
)
SELECT 
  cd.company_id,
  cd.tagline,
  cd.description,
  cd.cover_image_url,
  cd.main_video_url,
  cd.sns_x_url,
  cd.sns_instagram_url,
  cd.sns_tiktok_url,
  cd.sns_youtube_url,
  COALESCE(cd.short_videos, '[]'::jsonb),
  COALESCE(cd.documentary_videos, '[]'::jsonb),
  COALESCE(cd.company_videos, '[]'::jsonb),
  COALESCE(cd.benefits, ARRAY[]::text[]),
  cd.draft_status::draft_status,
  cd.submitted_at,
  cd.approved_at,
  cd.rejected_at,
  -- production_page_idは、production_company_idからcompany_pagesのidを取得
  (SELECT cp.id FROM company_pages cp WHERE cp.company_id = cd.production_company_id LIMIT 1),
  -- created_byはcompanies_draftに存在しないため、NULLを設定（後で更新可能）
  NULL as created_by,
  cd.created_at,
  cd.updated_at
FROM companies_draft cd
WHERE cd.tagline IS NOT NULL 
   OR cd.description IS NOT NULL 
   OR cd.cover_image_url IS NOT NULL 
   OR cd.main_video_url IS NOT NULL 
   OR cd.sns_x_url IS NOT NULL 
   OR cd.sns_instagram_url IS NOT NULL 
   OR cd.sns_tiktok_url IS NOT NULL 
   OR cd.sns_youtube_url IS NOT NULL 
   OR cd.short_videos IS NOT NULL 
   OR cd.documentary_videos IS NOT NULL 
   OR cd.company_videos IS NOT NULL 
   OR cd.benefits IS NOT NULL;

-- ============================================
-- 5. companiesテーブルから企業ページ用のカラムを削除
-- ============================================
-- データが入っていても削除可能。CASCADEで依存関係も削除
ALTER TABLE companies DROP COLUMN IF EXISTS tagline CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS description CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS cover_image_url CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS main_video_url CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS sns_x_url CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS sns_instagram_url CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS sns_tiktok_url CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS sns_youtube_url CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS short_videos CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS documentary_videos CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS company_videos CASCADE;
ALTER TABLE companies DROP COLUMN IF EXISTS benefits CASCADE;

-- ============================================
-- 6. companies_draftテーブルから企業ページ用のカラムを削除
-- ============================================
-- companies_draftテーブルから企業ページ用の項目を削除
-- これらの項目はcompany_pages_draftで管理される
-- データが入っていても削除可能。CASCADEで依存関係も削除
ALTER TABLE companies_draft DROP COLUMN IF EXISTS tagline CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS description CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS cover_image_url CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS main_video_url CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS sns_x_url CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS sns_instagram_url CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS sns_tiktok_url CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS sns_youtube_url CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS short_videos CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS documentary_videos CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS company_videos CASCADE;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS benefits CASCADE;

