-- 企業プロフィール用カラムの追加
-- companiesテーブルにプロフィールページで使用するカラムを追加

ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS main_video_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employees TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS capital TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS established TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS benefits TEXT[];
ALTER TABLE companies ADD COLUMN IF NOT EXISTS message_title TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS message_content TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS message_image_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS message_author TEXT;

