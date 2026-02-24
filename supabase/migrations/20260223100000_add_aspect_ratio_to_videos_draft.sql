-- videos_draft テーブルに aspect_ratio カラムを追加
-- 新S3ディレクトリ構造（companies/{cid}/videos/{vid}/）ではURLからアスペクト比を推測できないため、
-- DBカラムで管理する

ALTER TABLE videos_draft
  ADD COLUMN aspect_ratio TEXT
  CHECK (aspect_ratio IN ('landscape', 'portrait'))
  DEFAULT 'landscape';

COMMENT ON COLUMN videos_draft.aspect_ratio IS '動画のアスペクト比（landscape: 横長, portrait: 縦長）。MediaConvert変換テンプレートとS3出力パスの選択に使用する。';
