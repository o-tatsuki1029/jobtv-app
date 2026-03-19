-- LPサンプル動画にHLSストリーミング関連カラムを追加
ALTER TABLE lp_sample_videos
  ADD COLUMN IF NOT EXISTS hls_url text,
  ADD COLUMN IF NOT EXISTS auto_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS conversion_status text,
  ADD COLUMN IF NOT EXISTS conversion_job_id text,
  ADD COLUMN IF NOT EXISTS s3_key text;

-- conversion_status: null(未変換), 'processing'(変換中), 'completed'(完了), 'failed'(失敗)
COMMENT ON COLUMN lp_sample_videos.hls_url IS 'HLSマニフェストURL (CloudFront経由)';
COMMENT ON COLUMN lp_sample_videos.auto_thumbnail_url IS 'MediaConvert自動生成サムネイルURL';
COMMENT ON COLUMN lp_sample_videos.conversion_status IS '変換ステータス: null/processing/completed/failed';
COMMENT ON COLUMN lp_sample_videos.conversion_job_id IS 'MediaConvertジョブID';
COMMENT ON COLUMN lp_sample_videos.s3_key IS 'S3上のオリジナル動画キー';
