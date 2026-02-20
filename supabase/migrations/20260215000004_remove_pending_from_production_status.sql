-- 本番テーブルからpendingステータスを削除
-- 既存のpendingの値は全てactiveに変更
-- 審査中かどうかはドラフトテーブルのdraft_statusを参照する

-- 1. job_postingsテーブル
-- 1-1. pendingをactiveに変更
UPDATE job_postings SET status = 'active'::job_status WHERE status = 'pending'::job_status;

-- 1-2. デフォルト値を削除（型変更前に必要）
ALTER TABLE job_postings ALTER COLUMN status DROP DEFAULT;

-- 1-3. 新しいENUM型を作成（pendingを削除）
CREATE TYPE job_status_new AS ENUM ('active', 'closed');

-- 1-4. カラムの型を変更
ALTER TABLE job_postings 
  ALTER COLUMN status TYPE job_status_new 
  USING status::text::job_status_new;

-- 1-5. デフォルト値をactiveに設定
ALTER TABLE job_postings ALTER COLUMN status SET DEFAULT 'active'::job_status_new;

-- 1-6. 古いENUM型を削除
DROP TYPE job_status;

-- 1-7. 新しいENUM型の名前を変更
ALTER TYPE job_status_new RENAME TO job_status;

-- 2. sessionsテーブル
-- 2-1. pendingをactiveに変更
UPDATE sessions SET status = 'active'::session_status WHERE status = 'pending'::session_status;

-- 2-2. デフォルト値を削除（型変更前に必要）
ALTER TABLE sessions ALTER COLUMN status DROP DEFAULT;

-- 2-3. 新しいENUM型を作成（pendingを削除）
CREATE TYPE session_status_new AS ENUM ('active', 'closed');

-- 2-4. カラムの型を変更
ALTER TABLE sessions 
  ALTER COLUMN status TYPE session_status_new 
  USING status::text::session_status_new;

-- 2-5. デフォルト値をactiveに設定
ALTER TABLE sessions ALTER COLUMN status SET DEFAULT 'active'::session_status_new;

-- 2-6. 古いENUM型を削除
DROP TYPE session_status;

-- 2-7. 新しいENUM型の名前を変更
ALTER TYPE session_status_new RENAME TO session_status;

-- 3. companiesテーブル
-- 3-1. pendingをactiveに変更
UPDATE companies SET status = 'active'::company_status WHERE status = 'pending'::company_status;

-- 3-2. デフォルト値を削除（型変更前に必要）
ALTER TABLE companies ALTER COLUMN status DROP DEFAULT;

-- 3-3. 新しいENUM型を作成（pendingを削除）
CREATE TYPE company_status_new AS ENUM ('active', 'closed');

-- 3-4. カラムの型を変更
ALTER TABLE companies 
  ALTER COLUMN status TYPE company_status_new 
  USING status::text::company_status_new;

-- 3-5. デフォルト値をactiveに設定
ALTER TABLE companies ALTER COLUMN status SET DEFAULT 'active'::company_status_new;

-- 3-6. 古いENUM型を削除
DROP TYPE company_status;

-- 3-7. 新しいENUM型の名前を変更
ALTER TYPE company_status_new RENAME TO company_status;

-- 4. company_pagesテーブル
-- 4-1. pendingをactiveに変更
UPDATE company_pages SET status = 'active'::company_page_status WHERE status = 'pending'::company_page_status;

-- 4-2. デフォルト値を削除（型変更前に必要）
ALTER TABLE company_pages ALTER COLUMN status DROP DEFAULT;

-- 4-3. 新しいENUM型を作成（pendingを削除）
CREATE TYPE company_page_status_new AS ENUM ('active', 'closed');

-- 4-4. カラムの型を変更
ALTER TABLE company_pages 
  ALTER COLUMN status TYPE company_page_status_new 
  USING status::text::company_page_status_new;

-- 4-5. デフォルト値をactiveに設定
ALTER TABLE company_pages ALTER COLUMN status SET DEFAULT 'active'::company_page_status_new;

-- 4-6. 古いENUM型を削除
DROP TYPE company_page_status;

-- 4-7. 新しいENUM型の名前を変更
ALTER TYPE company_page_status_new RENAME TO company_page_status;

-- 5. コメントを更新
COMMENT ON COLUMN job_postings.status IS 'ステータス（active: 公開中、closed: 非公開）';
COMMENT ON COLUMN sessions.status IS 'ステータス（active: 公開中、closed: 終了）';
COMMENT ON COLUMN companies.status IS 'ステータス（active: 公開中、closed: 非公開）';
COMMENT ON COLUMN company_pages.status IS 'ステータス（active: 公開中、closed: 非公開）';

