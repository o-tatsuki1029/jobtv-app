-- candidates から名前カラムを削除（profiles に集約済み）
-- すべての候補者は auth ユーザー + profiles を持つため、名前は profiles のみで管理する
ALTER TABLE public.candidates DROP COLUMN IF EXISTS last_name;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS first_name;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS last_name_kana;
ALTER TABLE public.candidates DROP COLUMN IF EXISTS first_name_kana;
