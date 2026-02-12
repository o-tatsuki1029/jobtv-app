-- 既存のcompaniesテーブルのデータをcompanies_draftに転記
-- 審査フローに移行するための初期データ移行

INSERT INTO companies_draft (
  company_id,
  name,
  company_info,
  logo_url,
  website,
  address_line1,
  address_line2,
  established,
  employees,
  representative,
  industry,
  location,
  draft_status,
  production_company_id,
  created_at,
  updated_at
)
SELECT 
  id as company_id,
  name,
  company_info,
  logo_url,
  website,
  address_line1,
  address_line2,
  established,
  employees,
  representative,
  industry,
  location,
  CASE 
    WHEN status = 'active' THEN 'approved'
    WHEN status = 'closed' THEN 'rejected'
    ELSE 'draft'
  END as draft_status,
  id as production_company_id,
  created_at,
  updated_at
FROM companies
WHERE NOT EXISTS (
  SELECT 1 
  FROM companies_draft 
  WHERE companies_draft.company_id = companies.id
)
ON CONFLICT DO NOTHING;

-- 既存のcompaniesデータが承認済みとして扱われるように、approved_atを設定
UPDATE companies_draft
SET approved_at = created_at
WHERE draft_status = 'approved' 
  AND approved_at IS NULL
  AND production_company_id IS NOT NULL;

