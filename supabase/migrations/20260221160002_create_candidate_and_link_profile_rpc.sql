-- 会員登録後、candidates を 1 件作成し profiles.candidate_id を紐付ける RPC（1 トランザクション）
-- 呼び出し元は認証済みの candidate ロール。RLS により自分用の INSERT と自分の profile の UPDATE のみ許可される。

CREATE OR REPLACE FUNCTION public.create_candidate_and_link_profile(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid;
BEGIN
  INSERT INTO public.candidates (
    email,
    last_name,
    first_name,
    last_name_kana,
    first_name_kana,
    gender,
    residence_location,
    date_of_birth,
    phone,
    school_type,
    school_name,
    faculty_name,
    department_name,
    major_field,
    graduation_year,
    desired_industry,
    desired_job_type,
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term
  )
  VALUES (
    (payload->>'email'),
    (payload->>'last_name'),
    (payload->>'first_name'),
    (payload->>'last_name_kana'),
    (payload->>'first_name_kana'),
    (payload->>'gender'),
    (payload->>'residence_location'),
    NULLIF(trim(payload->>'date_of_birth'), '')::date,
    (payload->>'phone'),
    (payload->>'school_type'),
    (payload->>'school_name'),
    (payload->>'faculty_name'),
    (payload->>'department_name'),
    (payload->>'major_field'),
    (payload->>'graduation_year')::int,
    CASE
      WHEN payload->'desired_industry' IS NULL THEN NULL
      ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'desired_industry'))
    END,
    CASE
      WHEN payload->'desired_job_type' IS NULL THEN NULL
      ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'desired_job_type'))
    END,
    (payload->>'referrer'),
    (payload->>'utm_source'),
    (payload->>'utm_medium'),
    (payload->>'utm_campaign'),
    (payload->>'utm_content'),
    (payload->>'utm_term')
  )
  RETURNING id INTO v_candidate_id;

  UPDATE public.profiles
  SET candidate_id = v_candidate_id, updated_at = now()
  WHERE id = auth.uid();

  RETURN v_candidate_id;
END;
$$;

COMMENT ON FUNCTION public.create_candidate_and_link_profile(jsonb) IS '認証済み candidate が自分用の candidates 行を 1 件作成し、profiles.candidate_id に紐付ける。会員登録直後に 1 回だけ呼ぶ。';

GRANT EXECUTE ON FUNCTION public.create_candidate_and_link_profile(jsonb) TO authenticated;
