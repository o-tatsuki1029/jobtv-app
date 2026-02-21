-- 企業情報フィールドを追加（300字以内のテキスト）
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_info TEXT;




