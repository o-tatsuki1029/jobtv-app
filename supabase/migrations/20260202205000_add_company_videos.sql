-- 企業のショート動画とドキュメンタリー動画を保存するためのJSONBカラムを追加

ALTER TABLE companies ADD COLUMN IF NOT EXISTS short_videos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS documentary_videos JSONB DEFAULT '[]'::jsonb;

-- JSONBカラムの構造例:
-- short_videos: [{"id": "uuid", "title": "string", "video_url": "string", "thumbnail_url": "string"}]
-- documentary_videos: [{"id": "uuid", "title": "string", "video_url": "string", "thumbnail_url": "string"}]

