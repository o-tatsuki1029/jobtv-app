-- thumbnail_url を nullable に変更（動画のみの場合、自動サムネを使用）
ALTER TABLE top_page_hero_items ALTER COLUMN thumbnail_url DROP NOT NULL;

-- 自動生成サムネURL（MediaConvert Frame Capture で生成される）
ALTER TABLE top_page_hero_items ADD COLUMN auto_thumbnail_url text;

-- 動画変換完了フラグ（既存レコードは true にする）
ALTER TABLE top_page_hero_items ADD COLUMN is_converted boolean NOT NULL DEFAULT true;

-- MediaConvertジョブID（変換状況確認用）
ALTER TABLE top_page_hero_items ADD COLUMN mediaconvert_job_id text;
