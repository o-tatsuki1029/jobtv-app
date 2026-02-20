-- 審査フローに関連するテーブルおよび一部の管理テーブルから、管理者専用のRLSポリシーを削除
-- 管理者は今後、SUPABASE_SERVICE_ROLE_KEY (createAdminClient) を使用して
-- RLSをバイパスして操作を行うため、これらの明示的なポリシーは不要になります。

-- ============================================
-- 1. 動画関連 (videos / videos_draft)
-- ============================================
DROP POLICY IF EXISTS "Admins can view all videos" ON videos;
DROP POLICY IF EXISTS "Admins can view all drafts" ON videos_draft;
DROP POLICY IF EXISTS "Admins can update all drafts" ON videos_draft;

-- ============================================
-- 2. ドラフトテーブル (job_postings_draft, sessions_draft, companies_draft, company_pages_draft)
-- ============================================
DROP POLICY IF EXISTS "Admins can view all job drafts" ON job_postings_draft;
DROP POLICY IF EXISTS "Admins can update all job drafts" ON job_postings_draft;

DROP POLICY IF EXISTS "Admins can view all session drafts" ON sessions_draft;
DROP POLICY IF EXISTS "Admins can update all session drafts" ON sessions_draft;

DROP POLICY IF EXISTS "Admins can view all company info drafts" ON companies_draft;
DROP POLICY IF EXISTS "Admins can update all company info drafts" ON companies_draft;

DROP POLICY IF EXISTS "Admins can view all company page drafts" ON company_pages_draft;
DROP POLICY IF EXISTS "Admins can update all company page drafts" ON company_pages_draft;

-- ============================================
-- 3. 本番テーブル (job_postings, sessions, companies, company_pages)
-- ============================================
DROP POLICY IF EXISTS "Admins can update all job postings" ON job_postings;
DROP POLICY IF EXISTS "Admins can insert job postings" ON job_postings;

DROP POLICY IF EXISTS "Admins can update all sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can insert sessions" ON sessions;

DROP POLICY IF EXISTS "Admins can update all companies" ON companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;

DROP POLICY IF EXISTS "Admins can update all company pages" ON company_pages;
DROP POLICY IF EXISTS "Admins can insert company pages" ON company_pages;

-- ============================================
-- 4. その他管理者専用テーブル
-- ============================================
DROP POLICY IF EXISTS "Admins have full access to event_special_interviews" ON event_special_interviews;

-- 注記: 
-- "Admin and recruiters can ..." 系のポリシーは、リクルーターの権限を維持するために残しています。
-- また、一般ユーザー（企業ユーザー）用のポリシーもそのまま維持されます。

