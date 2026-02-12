-- companiesテーブルを分割するマイグレーション
-- 1. company_profiles: プロフィール情報
-- 2. company_details: 企業詳細情報
-- 3. company_social_media: SNS情報
-- 4. company_content: コンテンツ情報

-- ============================================
-- 1. company_profilesテーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  description text,
  tagline text,
  company_info text,
  logo_url text,
  cover_image_url text,
  main_video_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_company_profiles_company_id ON company_profiles(company_id);

-- RLSを有効化
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のプロフィールを閲覧・作成・更新できる
CREATE POLICY "Company users can view their company profiles"
  ON company_profiles FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_profiles.company_id
  ));

CREATE POLICY "Company users can insert their company profiles"
  ON company_profiles FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_profiles.company_id
  ));

CREATE POLICY "Company users can update their company profiles"
  ON company_profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_profiles.company_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_profiles.company_id
  ));

-- 公開ページでは誰でも閲覧可能
CREATE POLICY "Public can view company profiles"
  ON company_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 2. company_detailsテーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS company_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  industry text,
  employees text,
  location text,
  address text,
  address_line1 text,
  address_line2 text,
  representative text,
  established text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_company_details_company_id ON company_details(company_id);

-- RLSを有効化
ALTER TABLE company_details ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業の詳細を閲覧・作成・更新できる
CREATE POLICY "Company users can view their company details"
  ON company_details FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_details.company_id
  ));

CREATE POLICY "Company users can insert their company details"
  ON company_details FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_details.company_id
  ));

CREATE POLICY "Company users can update their company details"
  ON company_details FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_details.company_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_details.company_id
  ));

-- 公開ページでは誰でも閲覧可能
CREATE POLICY "Public can view company details"
  ON company_details FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 3. company_social_mediaテーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS company_social_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sns_x_url text,
  sns_instagram_url text,
  sns_tiktok_url text,
  sns_youtube_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_company_social_media_company_id ON company_social_media(company_id);

-- RLSを有効化
ALTER TABLE company_social_media ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のSNS情報を閲覧・作成・更新できる
CREATE POLICY "Company users can view their company social media"
  ON company_social_media FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_social_media.company_id
  ));

CREATE POLICY "Company users can insert their company social media"
  ON company_social_media FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_social_media.company_id
  ));

CREATE POLICY "Company users can update their company social media"
  ON company_social_media FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_social_media.company_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_social_media.company_id
  ));

-- 公開ページでは誰でも閲覧可能
CREATE POLICY "Public can view company social media"
  ON company_social_media FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 4. company_contentテーブルを作成
-- ============================================
CREATE TABLE IF NOT EXISTS company_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_videos jsonb DEFAULT '[]'::jsonb,
  short_videos jsonb DEFAULT '[]'::jsonb,
  documentary_videos jsonb DEFAULT '[]'::jsonb,
  benefits text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_company_content_company_id ON company_content(company_id);

-- RLSを有効化
ALTER TABLE company_content ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 企業ユーザーが自分の企業のコンテンツを閲覧・作成・更新できる
CREATE POLICY "Company users can view their company content"
  ON company_content FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_content.company_id
  ));

CREATE POLICY "Company users can insert their company content"
  ON company_content FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_content.company_id
  ));

CREATE POLICY "Company users can update their company content"
  ON company_content FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_content.company_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.company_id = company_content.company_id
  ));

-- 公開ページでは誰でも閲覧可能
CREATE POLICY "Public can view company content"
  ON company_content FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 5. 既存データを新しいテーブルに移行
-- ============================================
INSERT INTO company_profiles (company_id, description, tagline, company_info, logo_url, cover_image_url, main_video_url, created_at, updated_at)
SELECT 
  id,
  description,
  tagline,
  company_info,
  logo_url,
  cover_image_url,
  main_video_url,
  created_at,
  updated_at
FROM companies
WHERE description IS NOT NULL 
   OR tagline IS NOT NULL 
   OR company_info IS NOT NULL 
   OR logo_url IS NOT NULL 
   OR cover_image_url IS NOT NULL 
   OR main_video_url IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_details (company_id, industry, employees, location, address, address_line1, address_line2, representative, established, website, created_at, updated_at)
SELECT 
  id,
  industry,
  employees,
  location,
  address,
  address_line1,
  address_line2,
  representative,
  established,
  website,
  created_at,
  updated_at
FROM companies
WHERE industry IS NOT NULL 
   OR employees IS NOT NULL 
   OR location IS NOT NULL 
   OR address IS NOT NULL 
   OR address_line1 IS NOT NULL 
   OR address_line2 IS NOT NULL 
   OR representative IS NOT NULL 
   OR established IS NOT NULL 
   OR website IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_social_media (company_id, sns_x_url, sns_instagram_url, sns_tiktok_url, sns_youtube_url, created_at, updated_at)
SELECT 
  id,
  sns_x_url,
  sns_instagram_url,
  sns_tiktok_url,
  sns_youtube_url,
  created_at,
  updated_at
FROM companies
WHERE sns_x_url IS NOT NULL 
   OR sns_instagram_url IS NOT NULL 
   OR sns_tiktok_url IS NOT NULL 
   OR sns_youtube_url IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO company_content (company_id, company_videos, short_videos, documentary_videos, benefits, created_at, updated_at)
SELECT 
  id,
  COALESCE(company_videos, '[]'::jsonb),
  COALESCE(short_videos, '[]'::jsonb),
  COALESCE(documentary_videos, '[]'::jsonb),
  COALESCE(benefits, ARRAY[]::text[]),
  created_at,
  updated_at
FROM companies
WHERE company_videos IS NOT NULL 
   OR short_videos IS NOT NULL 
   OR documentary_videos IS NOT NULL 
   OR benefits IS NOT NULL
ON CONFLICT (company_id) DO NOTHING;

-- ============================================
-- 6. companiesテーブルから不要なカラムを削除
-- ============================================
-- 注意: この操作は既存のアプリケーションに影響を与える可能性があるため、
-- アプリケーションコードの更新後に実行することを推奨

-- ALTER TABLE companies DROP COLUMN IF EXISTS description;
-- ALTER TABLE companies DROP COLUMN IF EXISTS tagline;
-- ALTER TABLE companies DROP COLUMN IF EXISTS company_info;
-- ALTER TABLE companies DROP COLUMN IF EXISTS logo_url;
-- ALTER TABLE companies DROP COLUMN IF EXISTS cover_image_url;
-- ALTER TABLE companies DROP COLUMN IF EXISTS main_video_url;
-- ALTER TABLE companies DROP COLUMN IF EXISTS industry;
-- ALTER TABLE companies DROP COLUMN IF EXISTS employees;
-- ALTER TABLE companies DROP COLUMN IF EXISTS location;
-- ALTER TABLE companies DROP COLUMN IF EXISTS address;
-- ALTER TABLE companies DROP COLUMN IF EXISTS address_line1;
-- ALTER TABLE companies DROP COLUMN IF EXISTS address_line2;
-- ALTER TABLE companies DROP COLUMN IF EXISTS representative;
-- ALTER TABLE companies DROP COLUMN IF EXISTS established;
-- ALTER TABLE companies DROP COLUMN IF EXISTS website;
-- ALTER TABLE companies DROP COLUMN IF EXISTS sns_x_url;
-- ALTER TABLE companies DROP COLUMN IF EXISTS sns_instagram_url;
-- ALTER TABLE companies DROP COLUMN IF EXISTS sns_tiktok_url;
-- ALTER TABLE companies DROP COLUMN IF EXISTS sns_youtube_url;
-- ALTER TABLE companies DROP COLUMN IF EXISTS company_videos;
-- ALTER TABLE companies DROP COLUMN IF EXISTS short_videos;
-- ALTER TABLE companies DROP COLUMN IF EXISTS documentary_videos;
-- ALTER TABLE companies DROP COLUMN IF EXISTS benefits;

