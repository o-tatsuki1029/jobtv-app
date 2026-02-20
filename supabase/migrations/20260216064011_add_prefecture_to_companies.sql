-- companiesテーブルに都道府県カラムを追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS prefecture TEXT;
COMMENT ON COLUMN companies.prefecture IS '都道府県';

-- companies_draftテーブルに都道府県カラムを追加
ALTER TABLE companies_draft ADD COLUMN IF NOT EXISTS prefecture TEXT;
COMMENT ON COLUMN companies_draft.prefecture IS '都道府県';

