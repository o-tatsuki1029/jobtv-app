-- 企業テーブルに事業詳細・本社所在地・グループ会社・研修制度を追加
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS business_details text,
  ADD COLUMN IF NOT EXISTS headquarters text,
  ADD COLUMN IF NOT EXISTS group_companies text,
  ADD COLUMN IF NOT EXISTS training_program text;

ALTER TABLE companies_draft
  ADD COLUMN IF NOT EXISTS business_details text,
  ADD COLUMN IF NOT EXISTS headquarters text,
  ADD COLUMN IF NOT EXISTS group_companies text,
  ADD COLUMN IF NOT EXISTS training_program text;
