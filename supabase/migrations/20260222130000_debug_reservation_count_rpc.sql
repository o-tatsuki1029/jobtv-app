-- デバッグ用: 指定した session_date_ids に紐づく予約件数を RLS をバイパスして返す
-- 呼び出し元の企業に属する session_date のみ対象（他社の id を渡しても 0 を返す）

CREATE OR REPLACE FUNCTION public.get_company_reservation_count_for_dates(p_session_date_ids uuid[])
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM profiles p
  WHERE p.id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::bigint
    FROM session_reservations sr
    INNER JOIN session_dates sd ON sd.id = sr.session_date_id AND sd.id = ANY(p_session_date_ids)
    INNER JOIN sessions s ON s.id = sd.session_id AND s.company_id = v_company_id
  );
END;
$$;

COMMENT ON FUNCTION public.get_company_reservation_count_for_dates(uuid[]) IS '自社に属する session_date のうち、指定 id に紐づく予約件数を返す（RLS バイパス・デバッグ用）。';

GRANT EXECUTE ON FUNCTION public.get_company_reservation_count_for_dates(uuid[]) TO authenticated;
