-- 企業に紐づいた動画ライブラリ用のカラムを追加
-- このカラムは、企業が管理するすべての動画を保存するためのもの
-- short_videosとdocumentary_videosは、フロントエンドに表示する動画の選択用

ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_videos JSONB DEFAULT '[]'::jsonb;

-- JSONBカラムの構造:
-- company_videos: [{"id": "uuid", "title": "string", "video_url": "string", "thumbnail_url": "string"}]

