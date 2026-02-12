-- companiesテーブルにstatusカラムを追加（公開設定）

-- 1. company_status ENUM型を作成
CREATE TYPE company_status AS ENUM ('pending', 'active', 'closed');

-- 2. statusカラムを追加（デフォルトはpending）
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status company_status DEFAULT 'pending'::company_status;

-- 3. 既存のレコードはpendingに設定（既存データの保護）
UPDATE companies SET status = 'pending'::company_status WHERE status IS NULL;

