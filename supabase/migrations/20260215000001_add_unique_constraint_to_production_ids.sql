-- production_*_idにUNIQUE制約を追加
-- 一つの本番レコードに対してドラフトは1個のみという制約

-- job_postings_draft: production_job_idにUNIQUE制約（NULLを除く）
CREATE UNIQUE INDEX IF NOT EXISTS unique_job_postings_draft_production_job_id 
  ON job_postings_draft (production_job_id) 
  WHERE production_job_id IS NOT NULL;

-- sessions_draft: production_session_idにUNIQUE制約（NULLを除く）
CREATE UNIQUE INDEX IF NOT EXISTS unique_sessions_draft_production_session_id 
  ON sessions_draft (production_session_id) 
  WHERE production_session_id IS NOT NULL;

-- companies_draft: production_company_idにUNIQUE制約（NULLを除く）
CREATE UNIQUE INDEX IF NOT EXISTS unique_companies_draft_production_company_id 
  ON companies_draft (production_company_id) 
  WHERE production_company_id IS NOT NULL;

-- company_pages_draft: production_page_idにUNIQUE制約（NULLを除く）
CREATE UNIQUE INDEX IF NOT EXISTS unique_company_pages_draft_production_page_id 
  ON company_pages_draft (production_page_id) 
  WHERE production_page_id IS NOT NULL;


