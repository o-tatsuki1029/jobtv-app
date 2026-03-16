-- event_reservations に WEB相談希望カラムを追加
ALTER TABLE event_reservations ADD COLUMN web_consultation boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN event_reservations.web_consultation IS '就活お悩みWEB相談を希望するかどうか';
