-- events テーブルに管理・表示用フィールドを追加
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS gathering_time      TIME         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS display_name        TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS target_attendance   INTEGER      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS venue_address       TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS google_maps_url     TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_label          TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS form_area           TEXT         DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status              TEXT         NOT NULL DEFAULT 'active';

-- ステータスの CHECK 制約
ALTER TABLE events
  ADD CONSTRAINT events_status_check CHECK (status IN ('active', 'paused', 'cancelled'));

-- カラムコメント
COMMENT ON COLUMN events.gathering_time    IS '集合時間';
COMMENT ON COLUMN events.display_name      IS 'フロント表示用イベント名（NULL → event_types.name にフォールバック）';
COMMENT ON COLUMN events.target_attendance IS '集客目標数（admin 管理用、定員制限なし）';
COMMENT ON COLUMN events.venue_address     IS '会場住所';
COMMENT ON COLUMN events.google_maps_url   IS 'Google マップ URL';
COMMENT ON COLUMN events.form_label        IS 'フォーム表示用ラベル（NULL → event_types.name にフォールバック）';
COMMENT ON COLUMN events.form_area         IS 'フォーム表示用エリア（NULL → event_types.area にフォールバック）';
COMMENT ON COLUMN events.status            IS 'イベントステータス: active / paused / cancelled';
