-- 勤務地を都道府県と詳細に分割

-- 1. 都道府県カラムを追加
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS prefecture TEXT;

-- 2. 勤務地詳細カラムを追加（既存のlocationカラムをlocation_detailにリネームする代わりに、新しいカラムを追加）
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS location_detail TEXT;

-- 3. 既存のlocationデータをlocation_detailに移行（既存データの互換性のため）
UPDATE job_postings
SET location_detail = location
WHERE location_detail IS NULL AND location IS NOT NULL;

-- コメントを追加
COMMENT ON COLUMN job_postings.prefecture IS '都道府県';
COMMENT ON COLUMN job_postings.location_detail IS '勤務地詳細（例：東京都港区、リモート可など）';

