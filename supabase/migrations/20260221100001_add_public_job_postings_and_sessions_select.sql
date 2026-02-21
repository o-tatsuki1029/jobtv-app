-- 求人・説明会の一覧を未ログインでも取得できるようにする
-- status = 'active' の行のみ anon / authenticated が SELECT 可能

-- 求人: 公開中（active）のみ誰でも閲覧可能
CREATE POLICY "Public can view active job postings"
  ON job_postings FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- 説明会: 公開中（active）のみ誰でも閲覧可能
CREATE POLICY "Public can view active sessions"
  ON sessions FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
