-- 管理者が全ドラフトテーブルにアクセスできるようにRLSポリシーを追加

-- ============================================
-- 1. job_postings_draft テーブル
-- ============================================

-- 管理者が全求人ドラフトを閲覧できる
CREATE POLICY "Admins can view all job drafts"
  ON job_postings_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理者が全求人ドラフトを更新できる
CREATE POLICY "Admins can update all job drafts"
  ON job_postings_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 2. sessions_draft テーブル
-- ============================================

-- 管理者が全説明会ドラフトを閲覧できる
CREATE POLICY "Admins can view all session drafts"
  ON sessions_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理者が全説明会ドラフトを更新できる
CREATE POLICY "Admins can update all session drafts"
  ON sessions_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 3. companies_draft テーブル
-- ============================================

-- 管理者が全企業情報ドラフトを閲覧できる
CREATE POLICY "Admins can view all company info drafts"
  ON companies_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理者が全企業情報ドラフトを更新できる
CREATE POLICY "Admins can update all company info drafts"
  ON companies_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 4. company_pages_draft テーブル
-- ============================================

-- 管理者が全企業ページドラフトを閲覧できる
CREATE POLICY "Admins can view all company page drafts"
  ON company_pages_draft FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 管理者が全企業ページドラフトを更新できる
CREATE POLICY "Admins can update all company page drafts"
  ON company_pages_draft FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

