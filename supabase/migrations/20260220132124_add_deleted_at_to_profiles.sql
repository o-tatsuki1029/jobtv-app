-- Add deleted_at column to profiles table for soft delete
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- Add comment
COMMENT ON COLUMN profiles.deleted_at IS '論理削除日時。NULLの場合は有効なアカウント';

