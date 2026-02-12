-- 求人テーブルに不足しているフィールドを追加
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS salary TEXT,
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS benefits TEXT,
ADD COLUMN IF NOT EXISTS selection_process TEXT;

-- コメントを追加
COMMENT ON COLUMN job_postings.employment_type IS '雇用形態（正社員、契約社員、業務委託、インターンなど）';
COMMENT ON COLUMN job_postings.location IS '勤務地';
COMMENT ON COLUMN job_postings.salary IS '給与範囲（例: 800万円〜1,500万円）';
COMMENT ON COLUMN job_postings.requirements IS '応募資格';
COMMENT ON COLUMN job_postings.benefits IS '福利厚生・制度';
COMMENT ON COLUMN job_postings.selection_process IS '選考フロー';

