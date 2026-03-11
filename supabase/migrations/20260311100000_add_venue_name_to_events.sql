-- events テーブルに会場名カラムを追加
ALTER TABLE events ADD COLUMN venue_name text;

COMMENT ON COLUMN events.venue_name IS '会場名（例: 東京/赤坂ガーデンシティ）';
