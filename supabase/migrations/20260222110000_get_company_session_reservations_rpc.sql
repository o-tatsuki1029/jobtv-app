-- 企業が自社の説明会予約者を確実に取得するための RPC（RLS をバイパス）
-- 呼び出し元は authenticated で、recruiter の場合は自社分のみ、admin の場合は全件可能

CREATE OR REPLACE FUNCTION public.get_company_session_reservations(
  p_session_id uuid DEFAULT NULL,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  session_date_id uuid,
  candidate_id uuid,
  status text,
  attended boolean,
  created_at timestamptz,
  updated_at timestamptz,
  event_date date,
  start_time time,
  end_time time,
  session_id uuid,
  session_title text,
  last_name text,
  first_name text,
  last_name_kana text,
  first_name_kana text,
  phone text,
  school_name text,
  gender text,
  graduation_year int,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
BEGIN
  SELECT p.company_id, p.role::text INTO v_company_id, v_role
  FROM profiles p
  WHERE p.id = auth.uid();

  -- 未認証の場合は拒否
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'ログインが必要です';
  END IF;

  -- 企業担当者は company_id 必須
  IF v_role != 'admin' AND v_company_id IS NULL THEN
    RAISE EXCEPTION '企業情報が見つかりません';
  END IF;

  RETURN QUERY
  SELECT
    sr.id,
    sr.session_date_id,
    sr.candidate_id,
    sr.status,
    sr.attended,
    sr.created_at,
    sr.updated_at,
    sd.event_date,
    sd.start_time,
    sd.end_time,
    s.id AS session_id,
    s.title AS session_title,
    c.last_name,
    c.first_name,
    c.last_name_kana,
    c.first_name_kana,
    c.phone,
    c.school_name,
    c.gender,
    c.graduation_year,
    pr.email
  FROM session_reservations sr
  JOIN session_dates sd ON sd.id = sr.session_date_id
  JOIN sessions s ON s.id = sd.session_id
  JOIN candidates c ON c.id = sr.candidate_id
  LEFT JOIN profiles pr ON pr.candidate_id = c.id
  WHERE (v_role = 'admin' OR s.company_id = v_company_id)
    AND (p_session_id IS NULL OR s.id = p_session_id)
  ORDER BY sr.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_company_session_reservations(uuid, int) IS '企業担当者・管理者が予約一覧を取得する。SECURITY DEFINER で RLS をバイパスし、自社（admin の場合は全社）の予約を返す。';

GRANT EXECUTE ON FUNCTION public.get_company_session_reservations(uuid, int) TO authenticated;
