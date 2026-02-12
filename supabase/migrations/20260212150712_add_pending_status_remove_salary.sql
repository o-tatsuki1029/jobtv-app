-- job_status ENUM型に「pending」（審査中）を追加し、salaryカラムを削除

-- 1. デフォルト値を削除（型変更前に必要）
ALTER TABLE job_postings ALTER COLUMN status DROP DEFAULT;

-- 2. 新しいENUM型を作成（pendingを追加）
CREATE TYPE job_status_new AS ENUM ('pending', 'active', 'closed');

-- 3. カラムの型を変更（既存のactive/closedはそのまま維持）
ALTER TABLE job_postings 
  ALTER COLUMN status TYPE job_status_new 
  USING status::text::job_status_new;

-- 4. デフォルト値をpendingに設定（新規作成時はpending）
ALTER TABLE job_postings ALTER COLUMN status SET DEFAULT 'pending'::job_status_new;

-- 5. 古いENUM型を削除
DROP TYPE job_status;

-- 6. 新しいENUM型の名前を変更
ALTER TYPE job_status_new RENAME TO job_status;

-- 7. salaryカラムを削除
ALTER TABLE job_postings DROP COLUMN IF EXISTS salary;

