-- session_datesテーブルに公開読み取りポリシーを追加
-- 公開されている説明会（sessions.status = 'active'）の日程は誰でも閲覧可能

-- 既存のポリシーを削除して再作成（anonロールも含める）
DROP POLICY IF EXISTS "Public can view active session dates" ON session_dates;

-- 公開説明会の日程は誰でも閲覧可能
CREATE POLICY "Public can view active session dates"
  ON session_dates FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_dates.session_id
      AND sessions.status = 'active'
    )
  );

-- コメントを更新
COMMENT ON POLICY "Public can view active session dates" ON session_dates IS '公開中の説明会の日程は誰でも閲覧可能';


