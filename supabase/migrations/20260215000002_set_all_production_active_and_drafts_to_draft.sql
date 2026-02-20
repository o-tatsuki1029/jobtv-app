-- 既存の本番データを全てアクティブに設定
-- 既存のドラフトデータを全てドラフトに変更

-- 本番テーブルのstatusを全て"active"に設定
UPDATE job_postings
SET status = 'active'
WHERE status IS NOT NULL;

UPDATE sessions
SET status = 'active'
WHERE status IS NOT NULL;

UPDATE companies
SET status = 'active'
WHERE status IS NOT NULL;

-- company_pagesテーブルにはstatusカラムが存在しないため、スキップ

-- ドラフトテーブルのdraft_statusを全て"draft"に設定
UPDATE job_postings_draft
SET draft_status = 'draft'
WHERE draft_status IS NOT NULL;

UPDATE sessions_draft
SET draft_status = 'draft'
WHERE draft_status IS NOT NULL;

UPDATE companies_draft
SET draft_status = 'draft'
WHERE draft_status IS NOT NULL;

UPDATE company_pages_draft
SET draft_status = 'draft'
WHERE draft_status IS NOT NULL;

