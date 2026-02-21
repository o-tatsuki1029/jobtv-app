-- 資本金カラムを削除し、住所フィールドを追加
-- capitalカラムを削除
ALTER TABLE companies DROP COLUMN IF EXISTS capital;

-- 住所(番地まで)を追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line1 TEXT;

-- 住所(ビル名・部屋番号)を追加
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_line2 TEXT;




