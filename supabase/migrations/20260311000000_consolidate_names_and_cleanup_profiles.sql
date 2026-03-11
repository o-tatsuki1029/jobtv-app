-- 1. profiles.candidate_id に UNIQUE 制約追加（PostgREST で 1:1 JOIN するために必須）
ALTER TABLE public.profiles ADD CONSTRAINT profiles_candidate_id_unique UNIQUE (candidate_id);

-- 2. candidates → profiles への名前バックフィル（未設定の profiles レコードを埋める）
UPDATE public.profiles p
SET
  last_name = c.last_name,
  first_name = c.first_name,
  last_name_kana = c.last_name_kana,
  first_name_kana = c.first_name_kana,
  updated_at = NOW()
FROM public.candidates c
WHERE p.candidate_id = c.id
  AND (p.last_name IS NULL OR p.first_name IS NULL
       OR p.last_name_kana IS NULL OR p.first_name_kana IS NULL);

-- 3. 不要カラム削除（username, avatar_url, website）
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS username_length;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS username;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS avatar_url;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS website;
