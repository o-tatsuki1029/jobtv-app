-- 企業テーブルに郵便番号を追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE companies_draft ADD COLUMN IF NOT EXISTS postal_code text;
