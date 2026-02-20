-- profilesテーブルからfull_nameカラムを削除
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

