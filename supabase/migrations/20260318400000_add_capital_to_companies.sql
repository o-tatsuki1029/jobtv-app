-- 企業テーブルに資本金を追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS capital text;
ALTER TABLE companies_draft ADD COLUMN IF NOT EXISTS capital text;
