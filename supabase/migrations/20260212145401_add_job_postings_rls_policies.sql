-- job_postingsテーブルのRLSポリシーを追加
-- jobtvアプリで企業ユーザーが自分の企業の求人を作成・編集・削除できるようにする

-- 既存のポリシーを削除（念のため）
DROP POLICY IF EXISTS "Company users can insert their company job postings" ON job_postings;
DROP POLICY IF EXISTS "Company users can update their company job postings" ON job_postings;
DROP POLICY IF EXISTS "Company users can delete their company job postings" ON job_postings;
DROP POLICY IF EXISTS "Company users can view their company job postings" ON job_postings;

-- 企業ユーザーが自分の企業の求人を閲覧できるポリシー
CREATE POLICY "Company users can view their company job postings"
  ON job_postings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings.company_id
    )
  );

-- 企業ユーザーが自分の企業の求人を作成できるポリシー
CREATE POLICY "Company users can insert their company job postings"
  ON job_postings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings.company_id
    )
  );

-- 企業ユーザーが自分の企業の求人を更新できるポリシー
CREATE POLICY "Company users can update their company job postings"
  ON job_postings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings.company_id
    )
  );

-- 企業ユーザーが自分の企業の求人を削除できるポリシー
CREATE POLICY "Company users can delete their company job postings"
  ON job_postings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.company_id = job_postings.company_id
    )
  );

