-- videos_draft: auto_thumbnail_url カラムを追加
ALTER TABLE videos_draft ADD COLUMN auto_thumbnail_url TEXT;
COMMENT ON COLUMN videos_draft.auto_thumbnail_url IS 'MediaConvert Frame Captureで自動生成されたサムネイルURL';

-- videos: source_url / streaming_url / auto_thumbnail_url カラムを追加
ALTER TABLE videos ADD COLUMN source_url TEXT;
ALTER TABLE videos ADD COLUMN streaming_url TEXT;
ALTER TABLE videos ADD COLUMN auto_thumbnail_url TEXT;

-- 既存データの migration: video_url には HLS URL が入っているので streaming_url にコピー
UPDATE videos SET streaming_url = video_url;

COMMENT ON COLUMN videos.source_url IS 'アップロード元の動画ファイルURL（CloudFront経由）';
COMMENT ON COLUMN videos.streaming_url IS 'HLSストリーミングURL（MediaConvert変換後）';
COMMENT ON COLUMN videos.auto_thumbnail_url IS 'MediaConvert Frame Captureで自動生成されたサムネイルURL';
