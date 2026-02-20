-- Add conversion status columns to videos_draft table
ALTER TABLE videos_draft 
ADD COLUMN IF NOT EXISTS conversion_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS mediaconvert_job_id TEXT,
ADD COLUMN IF NOT EXISTS streaming_url TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_draft_conversion_status 
ON videos_draft(conversion_status);
CREATE INDEX IF NOT EXISTS idx_videos_draft_mediaconvert_job_id 
ON videos_draft(mediaconvert_job_id);

-- Add comments for documentation
COMMENT ON COLUMN videos_draft.conversion_status IS '動画変換ステータス: pending, processing, completed, failed';
COMMENT ON COLUMN videos_draft.mediaconvert_job_id IS 'AWS MediaConvertジョブID';
COMMENT ON COLUMN videos_draft.streaming_url IS 'HLSマニフェストURL（変換完了後に設定）';

