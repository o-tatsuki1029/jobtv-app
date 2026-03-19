-- companies.notes と companies_draft.notes を削除（未使用カラム）
ALTER TABLE companies DROP COLUMN IF EXISTS notes;
ALTER TABLE companies_draft DROP COLUMN IF EXISTS notes;
