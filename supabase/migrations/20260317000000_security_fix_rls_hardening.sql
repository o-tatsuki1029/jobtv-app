-- =============================================================================
-- セキュリティ修正: RLS ポリシー強化
-- C-1: anon ロールの不要な GRANT を REVOKE
-- C-2: session_reservations の anon INSERT 削除
-- H-1: イベント系テーブルを admin/recruiter に制限
-- H-2: 電話/ca_interviews/comment_templates を admin/recruiter に制限
-- M-1, M-3: candidates テーブルの重複ポリシー整理
-- M-2: top_page_hero_items の admin チェック修正
-- M-8: 各種テーブルの USING(true) ポリシー整理
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1-A: anon ロールの不要な GRANT を REVOKE（C-1）
-- =============================================================================

-- 全権限を剥奪するテーブル（anon アクセス不要）
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.candidates FROM anon;
REVOKE ALL ON public.candidate_management FROM anon;
REVOKE ALL ON public.applications FROM anon;
REVOKE ALL ON public.application_progress FROM anon;
REVOKE ALL ON public.companies_draft FROM anon;
REVOKE ALL ON public.company_pages_draft FROM anon;
REVOKE ALL ON public.job_postings_draft FROM anon;
REVOKE ALL ON public.sessions_draft FROM anon;
REVOKE ALL ON public.session_dates_draft FROM anon;
REVOKE ALL ON public.videos_draft FROM anon;
REVOKE ALL ON public.session_reservations FROM anon;
REVOKE ALL ON public.events FROM anon;
REVOKE ALL ON public.event_types FROM anon;
REVOKE ALL ON public.event_areas FROM anon;
REVOKE ALL ON public.event_graduation_years FROM anon;
REVOKE ALL ON public.event_companies FROM anon;
REVOKE ALL ON public.event_reservations FROM anon;
REVOKE ALL ON public.event_special_interviews FROM anon;
REVOKE ALL ON public.event_matching_sessions FROM anon;
REVOKE ALL ON public.event_ratings_candidate_to_company FROM anon;
REVOKE ALL ON public.event_ratings_recruiter_to_candidate FROM anon;
REVOKE ALL ON public.matching_results FROM anon;
REVOKE ALL ON public.phone_calls FROM anon;
REVOKE ALL ON public.phone_call_lists FROM anon;
REVOKE ALL ON public.phone_call_list_items FROM anon;
REVOKE ALL ON public.ca_interviews FROM anon;
REVOKE ALL ON public.comment_templates FROM anon;
REVOKE ALL ON public.notifications FROM anon;
REVOKE ALL ON public.notification_reads FROM anon;
REVOKE ALL ON public.email_templates FROM anon;
REVOKE ALL ON public.email_logs FROM anon;

-- 公開コンテンツテーブル: SELECT のみ残し、書き込みを REVOKE
REVOKE INSERT, UPDATE, DELETE ON public.companies FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.company_pages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.job_postings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.session_dates FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.videos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.top_page_hero_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.top_page_featured_videos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.top_page_banners FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.top_page_ambassadors FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.top_page_documentaries FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.top_page_shun_diaries FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.lp_sample_videos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.lp_faq_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.lp_company_logos FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.lp_scroll_banner FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.school_master FROM anon;

-- =============================================================================
-- 1-B: session_reservations の anon INSERT 削除（C-2）
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can create reservations" ON public.session_reservations;

-- =============================================================================
-- 1-C: イベント系テーブルの ALL 権限を admin/recruiter に制限（H-1）
-- =============================================================================

-- --- events ---
DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;

CREATE POLICY "Authenticated can view events"
  ON public.events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage events"
  ON public.events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_companies ---
DROP POLICY IF EXISTS "Authenticated users can view event companies" ON public.event_companies;
DROP POLICY IF EXISTS "Authenticated users can manage event companies" ON public.event_companies;

CREATE POLICY "Authenticated can view event_companies"
  ON public.event_companies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_companies"
  ON public.event_companies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_matching_sessions ---
DROP POLICY IF EXISTS "Authenticated users can view matching sessions" ON public.event_matching_sessions;
DROP POLICY IF EXISTS "Authenticated users can manage matching sessions" ON public.event_matching_sessions;

CREATE POLICY "Authenticated can view event_matching_sessions"
  ON public.event_matching_sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_matching_sessions"
  ON public.event_matching_sessions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_ratings_candidate_to_company ---
DROP POLICY IF EXISTS "Authenticated users can view candidate ratings" ON public.event_ratings_candidate_to_company;
DROP POLICY IF EXISTS "Authenticated users can manage candidate ratings" ON public.event_ratings_candidate_to_company;

CREATE POLICY "Authenticated can view event_ratings_candidate_to_company"
  ON public.event_ratings_candidate_to_company FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_ratings_candidate_to_company"
  ON public.event_ratings_candidate_to_company FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_ratings_recruiter_to_candidate ---
DROP POLICY IF EXISTS "Authenticated users can view recruiter ratings" ON public.event_ratings_recruiter_to_candidate;
DROP POLICY IF EXISTS "Authenticated users can manage recruiter ratings" ON public.event_ratings_recruiter_to_candidate;

CREATE POLICY "Authenticated can view event_ratings_recruiter_to_candidate"
  ON public.event_ratings_recruiter_to_candidate FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_ratings_recruiter_to_candidate"
  ON public.event_ratings_recruiter_to_candidate FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_reservations ---
DROP POLICY IF EXISTS "Authenticated users can view event reservations" ON public.event_reservations;
DROP POLICY IF EXISTS "Authenticated users can manage event reservations" ON public.event_reservations;

CREATE POLICY "Authenticated can view event_reservations"
  ON public.event_reservations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_reservations"
  ON public.event_reservations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- matching_results ---
DROP POLICY IF EXISTS "Authenticated users can view matching results" ON public.matching_results;
DROP POLICY IF EXISTS "Authenticated users can manage matching results" ON public.matching_results;

CREATE POLICY "Authenticated can view matching_results"
  ON public.matching_results FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage matching_results"
  ON public.matching_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_types ---
DROP POLICY IF EXISTS "Authenticated users can view all master event types" ON public.event_types;
DROP POLICY IF EXISTS "Admins can manage master event types" ON public.event_types;

CREATE POLICY "Authenticated can view event_types"
  ON public.event_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_types"
  ON public.event_types FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_areas ---
DROP POLICY IF EXISTS "Authenticated users can view all master areas" ON public.event_areas;
DROP POLICY IF EXISTS "Admins can manage master areas" ON public.event_areas;

CREATE POLICY "Authenticated can view event_areas"
  ON public.event_areas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_areas"
  ON public.event_areas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_graduation_years ---
DROP POLICY IF EXISTS "Authenticated users can view all master graduation years" ON public.event_graduation_years;
DROP POLICY IF EXISTS "Admins can manage master graduation years" ON public.event_graduation_years;

CREATE POLICY "Authenticated can view event_graduation_years"
  ON public.event_graduation_years FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_graduation_years"
  ON public.event_graduation_years FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- event_special_interviews ---
DROP POLICY IF EXISTS "Recruiters can view their company's special interviews" ON public.event_special_interviews;

CREATE POLICY "Authenticated can view event_special_interviews"
  ON public.event_special_interviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin and recruiters can manage event_special_interviews"
  ON public.event_special_interviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- =============================================================================
-- 1-D: 電話/CA面談/コメントテンプレートを admin/recruiter に制限（H-2, M-8）
-- =============================================================================

-- --- phone_calls ---
DROP POLICY IF EXISTS "Allow authenticated users to read phone_calls" ON public.phone_calls;
DROP POLICY IF EXISTS "Allow authenticated users to insert phone_calls" ON public.phone_calls;
DROP POLICY IF EXISTS "Allow authenticated users to update phone_calls" ON public.phone_calls;
DROP POLICY IF EXISTS "Allow authenticated users to delete phone_calls" ON public.phone_calls;

CREATE POLICY "Admin and recruiters can view phone_calls"
  ON public.phone_calls FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

CREATE POLICY "Admin and recruiters can manage phone_calls"
  ON public.phone_calls FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- phone_call_lists ---
DROP POLICY IF EXISTS "Allow authenticated users to read phone_call_lists" ON public.phone_call_lists;
DROP POLICY IF EXISTS "Allow authenticated users to insert phone_call_lists" ON public.phone_call_lists;
DROP POLICY IF EXISTS "Allow authenticated users to update phone_call_lists" ON public.phone_call_lists;
DROP POLICY IF EXISTS "Allow authenticated users to delete phone_call_lists" ON public.phone_call_lists;

CREATE POLICY "Admin and recruiters can view phone_call_lists"
  ON public.phone_call_lists FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

CREATE POLICY "Admin and recruiters can manage phone_call_lists"
  ON public.phone_call_lists FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- phone_call_list_items ---
DROP POLICY IF EXISTS "Allow authenticated users to read phone_call_list_items" ON public.phone_call_list_items;
DROP POLICY IF EXISTS "Allow authenticated users to insert phone_call_list_items" ON public.phone_call_list_items;
DROP POLICY IF EXISTS "Allow authenticated users to update phone_call_list_items" ON public.phone_call_list_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete phone_call_list_items" ON public.phone_call_list_items;

CREATE POLICY "Admin and recruiters can view phone_call_list_items"
  ON public.phone_call_list_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

CREATE POLICY "Admin and recruiters can manage phone_call_list_items"
  ON public.phone_call_list_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- ca_interviews ---
DROP POLICY IF EXISTS "Allow authenticated users to read ca_interviews" ON public.ca_interviews;
DROP POLICY IF EXISTS "Allow authenticated users to insert ca_interviews" ON public.ca_interviews;
DROP POLICY IF EXISTS "Allow authenticated users to update ca_interviews" ON public.ca_interviews;
DROP POLICY IF EXISTS "Allow authenticated users to delete ca_interviews" ON public.ca_interviews;

CREATE POLICY "Admin and recruiters can view ca_interviews"
  ON public.ca_interviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

CREATE POLICY "Admin and recruiters can manage ca_interviews"
  ON public.ca_interviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- --- comment_templates ---
DROP POLICY IF EXISTS "Authenticated users can view comment templates" ON public.comment_templates;
DROP POLICY IF EXISTS "Authenticated users can manage comment templates" ON public.comment_templates;

CREATE POLICY "Admin and recruiters can view comment_templates"
  ON public.comment_templates FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

CREATE POLICY "Admin and recruiters can manage comment_templates"
  ON public.comment_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'recruiter')));

-- =============================================================================
-- 1-E: candidates テーブルの重複ポリシー整理（M-1, M-3）
-- =============================================================================

-- public ロール版を削除（authenticated 版 "Candidates can * own row" が既に存在）
DROP POLICY IF EXISTS "Candidates can view their own data" ON public.candidates;
DROP POLICY IF EXISTS "Candidates can update their own data" ON public.candidates;

-- =============================================================================
-- 1-F: top_page_hero_items の admin チェック修正（M-2）
-- =============================================================================

-- 既存の壊れたポリシー（auth.jwt() ->> 'role' = 'admin' は Supabase role を参照してしまう）
DROP POLICY IF EXISTS "Admin can manage hero items" ON public.top_page_hero_items;

-- profiles.role を参照する正しいポリシーに置き換え
CREATE POLICY "Admin can manage hero items"
  ON public.top_page_hero_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;
