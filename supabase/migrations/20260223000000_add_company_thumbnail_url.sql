-- 企業サムネ画像（トップページの企業カード表示用）。ロゴとは別の新規概念。
-- 未設定の場合は従来どおりロゴを表示する。

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE companies_draft
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

COMMENT ON COLUMN companies.thumbnail_url IS 'トップページ企業カード用サムネイル画像URL。未設定時はlogo_urlを使用';
COMMENT ON COLUMN companies_draft.thumbnail_url IS 'トップページ企業カード用サムネイル画像URL（ドラフト）';
