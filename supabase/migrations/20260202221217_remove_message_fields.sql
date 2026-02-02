-- 採用メッセージ関連のカラムを削除
ALTER TABLE companies DROP COLUMN IF EXISTS message_title;
ALTER TABLE companies DROP COLUMN IF EXISTS message_content;
ALTER TABLE companies DROP COLUMN IF EXISTS message_image_url;
ALTER TABLE companies DROP COLUMN IF EXISTS message_author;

