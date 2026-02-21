-- 企業公開ページを未ログイン・求職者でも閲覧できるようにする
-- companies テーブルに anon / authenticated 向けの SELECT ポリシーを追加

CREATE POLICY "Public can view companies"
  ON companies FOR SELECT
  TO anon, authenticated
  USING (true);
