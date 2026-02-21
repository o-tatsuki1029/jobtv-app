-- 説明会の満席表示のため、未ログインでも「日程別予約数」だけを取得できるようにする
-- 予約の個人情報は一切返さず、公開中説明会の session_date_id ごとの件数のみ返す RPC

CREATE OR REPLACE FUNCTION get_public_session_date_reservation_counts(session_date_ids uuid[])
RETURNS TABLE(session_date_id uuid, reservation_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sd.id AS session_date_id, count(sr.id)::bigint AS reservation_count
  FROM session_dates sd
  INNER JOIN sessions s ON s.id = sd.session_id AND s.status = 'active'
  LEFT JOIN session_reservations sr ON sr.session_date_id = sd.id AND sr.status = 'reserved'
  WHERE sd.id = ANY(session_date_ids)
  GROUP BY sd.id;
$$;

COMMENT ON FUNCTION get_public_session_date_reservation_counts(uuid[]) IS '公開中の説明会について、指定した日程IDごとの予約数（reserved のみ）を返す。anon でも実行可能。';

GRANT EXECUTE ON FUNCTION get_public_session_date_reservation_counts(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION get_public_session_date_reservation_counts(uuid[]) TO authenticated;
