-- company_pagesテーブルにstatusカラムを追加（公開設定）

-- 1. company_page_status ENUM型を作成
CREATE TYPE company_page_status AS ENUM ('pending', 'active', 'closed');

-- 2. statusカラムを追加（デフォルトはpending）
ALTER TABLE company_pages 
ADD COLUMN IF NOT EXISTS status company_page_status DEFAULT 'pending'::company_page_status;

-- 3. 既存のレコードはpendingに設定（既存データの保護）
UPDATE company_pages SET status = 'pending'::company_page_status WHERE status IS NULL;

-- 4. NOT NULL制約を追加
ALTER TABLE company_pages 
ALTER COLUMN status SET NOT NULL;

-- 5. インデックスを追加
CREATE INDEX IF NOT EXISTS idx_company_pages_status ON company_pages(status);

-- 6. コメントを追加
COMMENT ON COLUMN company_pages.status IS 'ステータス（pending: 審査中、active: 公開中、closed: 非公開）';

