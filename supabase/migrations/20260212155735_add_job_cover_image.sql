-- 求人テーブルにカバー画像カラムを追加

ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- コメントを追加
COMMENT ON COLUMN job_postings.cover_image_url IS '求人のカバー画像URL';

