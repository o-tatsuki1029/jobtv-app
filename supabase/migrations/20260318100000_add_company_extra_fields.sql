-- 企業テーブルに追加フィールド: 電話番号、売上高、平均年齢、上場区分、過去サービスID、Facebook URL
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS revenue text,
  ADD COLUMN IF NOT EXISTS average_age numeric,
  ADD COLUMN IF NOT EXISTS listing_status text,
  ADD COLUMN IF NOT EXISTS legacy_service_id text,
  ADD COLUMN IF NOT EXISTS sns_facebook_url text;

ALTER TABLE companies_draft
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS revenue text,
  ADD COLUMN IF NOT EXISTS average_age numeric,
  ADD COLUMN IF NOT EXISTS listing_status text,
  ADD COLUMN IF NOT EXISTS legacy_service_id text,
  ADD COLUMN IF NOT EXISTS sns_facebook_url text;
