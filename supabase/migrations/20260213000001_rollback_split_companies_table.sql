-- 企業テーブル分割のロールバック
-- 作成したテーブルを削除し、companiesテーブルに元のカラムを復元

-- ============================================
-- 1. 新しいテーブルからデータをcompaniesテーブルに戻す
-- ============================================

-- company_profilesのデータをcompaniesに戻す
UPDATE companies c
SET 
  description = cp.description,
  tagline = cp.tagline,
  company_info = cp.company_info,
  logo_url = cp.logo_url,
  cover_image_url = cp.cover_image_url,
  main_video_url = cp.main_video_url,
  updated_at = NOW()
FROM company_profiles cp
WHERE c.id = cp.company_id;

-- company_detailsのデータをcompaniesに戻す
UPDATE companies c
SET 
  industry = cd.industry,
  employees = cd.employees,
  location = cd.location,
  address = cd.address,
  address_line1 = cd.address_line1,
  address_line2 = cd.address_line2,
  representative = cd.representative,
  established = cd.established,
  website = cd.website,
  updated_at = NOW()
FROM company_details cd
WHERE c.id = cd.company_id;

-- company_social_mediaのデータをcompaniesに戻す
UPDATE companies c
SET 
  sns_x_url = csm.sns_x_url,
  sns_instagram_url = csm.sns_instagram_url,
  sns_tiktok_url = csm.sns_tiktok_url,
  sns_youtube_url = csm.sns_youtube_url,
  updated_at = NOW()
FROM company_social_media csm
WHERE c.id = csm.company_id;

-- company_contentのデータをcompaniesに戻す
UPDATE companies c
SET 
  company_videos = cc.company_videos,
  short_videos = cc.short_videos,
  documentary_videos = cc.documentary_videos,
  benefits = cc.benefits,
  updated_at = NOW()
FROM company_content cc
WHERE c.id = cc.company_id;

-- ============================================
-- 2. companiesテーブルに元のカラムが存在しない場合は追加
-- ============================================

-- プロフィール情報のカラム
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_info TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_video_url TEXT;

-- 企業詳細情報のカラム
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employees TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS established TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;

-- SNS情報のカラム
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_x_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_instagram_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_tiktok_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_youtube_url TEXT;

-- コンテンツ情報のカラム
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_videos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS short_videos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS documentary_videos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS benefits TEXT[] DEFAULT ARRAY[]::text[];

-- ============================================
-- 3. 作成したテーブルを削除
-- ============================================

-- RLSポリシーを削除
DROP POLICY IF EXISTS "Company users can view their company profiles" ON company_profiles;
DROP POLICY IF EXISTS "Company users can insert their company profiles" ON company_profiles;
DROP POLICY IF EXISTS "Company users can update their company profiles" ON company_profiles;
DROP POLICY IF EXISTS "Public can view company profiles" ON company_profiles;

DROP POLICY IF EXISTS "Company users can view their company details" ON company_details;
DROP POLICY IF EXISTS "Company users can insert their company details" ON company_details;
DROP POLICY IF EXISTS "Company users can update their company details" ON company_details;
DROP POLICY IF EXISTS "Public can view company details" ON company_details;

DROP POLICY IF EXISTS "Company users can view their company social media" ON company_social_media;
DROP POLICY IF EXISTS "Company users can insert their company social media" ON company_social_media;
DROP POLICY IF EXISTS "Company users can update their company social media" ON company_social_media;
DROP POLICY IF EXISTS "Public can view company social media" ON company_social_media;

DROP POLICY IF EXISTS "Company users can view their company content" ON company_content;
DROP POLICY IF EXISTS "Company users can insert their company content" ON company_content;
DROP POLICY IF EXISTS "Company users can update their company content" ON company_content;
DROP POLICY IF EXISTS "Public can view company content" ON company_content;

-- テーブルを削除
DROP TABLE IF EXISTS company_content CASCADE;
DROP TABLE IF EXISTS company_social_media CASCADE;
DROP TABLE IF EXISTS company_details CASCADE;
DROP TABLE IF EXISTS company_profiles CASCADE;

