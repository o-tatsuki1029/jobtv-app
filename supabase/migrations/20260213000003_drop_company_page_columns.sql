-- companiesテーブルとcompanies_draftテーブルから企業ページ用のカラムを削除
-- これらのカラムはcompany_pagesテーブルに移行済み

-- ============================================
-- companiesテーブルから企業ページ用のカラムを削除
-- ============================================
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
-- companies_draftテーブルから企業ページ用のカラムを削除
-- ============================================
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

