-- 企業プロフィールに見出し（tagline）とSNS URLカラムを追加

ALTER TABLE companies ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_x_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_instagram_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_tiktok_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sns_youtube_url TEXT;

