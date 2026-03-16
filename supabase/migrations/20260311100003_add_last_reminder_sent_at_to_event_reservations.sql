-- event_reservations にリマインド送信管理カラムを追加
ALTER TABLE event_reservations ADD COLUMN last_reminder_sent_at timestamptz;

COMMENT ON COLUMN event_reservations.last_reminder_sent_at IS 'リマインドメール最終送信日時（重複送信防止用）';
