-- events テーブルに論理削除用カラムを追加
ALTER TABLE events ADD COLUMN deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN events.deleted_at IS '論理削除日時。NULLでない場合は削除済み';

-- 削除済みイベントを除外するための部分インデックス
CREATE INDEX idx_events_not_deleted ON events (event_date) WHERE deleted_at IS NULL;
