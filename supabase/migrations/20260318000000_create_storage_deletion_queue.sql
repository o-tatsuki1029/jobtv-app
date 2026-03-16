-- ストレージ削除キュー: 全削除操作を蓄積し、管理者承認後に実行する
CREATE TABLE storage_deletion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_type TEXT NOT NULL CHECK (storage_type IN ('s3', 'supabase')),
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  is_prefix BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL,
  source_detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_storage_deletion_queue_status ON storage_deletion_queue (status);
CREATE INDEX idx_storage_deletion_queue_created_at ON storage_deletion_queue (created_at);

-- ストレージクリーンアップスケジュール: フルスキャンの日時予約
CREATE TABLE storage_cleanup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_from TIMESTAMPTZ NOT NULL,
  scan_to TIMESTAMPTZ NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  result JSONB
);

CREATE INDEX idx_storage_cleanup_schedules_status ON storage_cleanup_schedules (status);

-- RLS: service_role のみアクセス可能（管理者 Server Action 経由）
ALTER TABLE storage_deletion_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_cleanup_schedules ENABLE ROW LEVEL SECURITY;
