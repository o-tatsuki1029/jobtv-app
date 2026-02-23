-- session_reservations の企業向け SELECT を、RLS チェーンに依存しない SECURITY DEFINER 関数で判定する
-- （従来の EXISTS 内で sessions/session_dates を読むと、それらの RLS で 0 件になり予約が取れない事象を回避）

CREATE OR REPLACE FUNCTION public.session_date_belongs_to_current_user_company(p_session_date_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN sessions s ON s.company_id = p.company_id
    INNER JOIN session_dates sd ON sd.session_id = s.id AND sd.id = p_session_date_id
    WHERE p.id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.session_date_belongs_to_current_user_company(uuid) IS '指定した session_date が、現在のユーザー（企業）の説明会に属するか。RLS をバイパスして判定する。';

-- 既存の企業向け SELECT ポリシーを、上記関数を使う定義に差し替え
DROP POLICY IF EXISTS "Company users can view their company session reservations" ON public.session_reservations;

CREATE POLICY "Company users can view their company session reservations"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (public.session_date_belongs_to_current_user_company(session_date_id));
