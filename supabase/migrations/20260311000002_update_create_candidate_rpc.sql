-- RPC create_candidate_and_link_profile を更新
-- 名前は profiles にのみ書き込む（candidates の名前カラムは削除済み）
CREATE OR REPLACE FUNCTION public.create_candidate_and_link_profile(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id uuid;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- candidates に INSERT（名前以外）
  INSERT INTO public.candidates (
    gender, desired_work_location, date_of_birth, phone,
    school_type, school_name, school_kcode, faculty_name, department_name,
    major_field, graduation_year, desired_industry, desired_job_type,
    referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term
  ) VALUES (
    (payload->>'gender'), (payload->>'desired_work_location'),
    NULLIF(trim(payload->>'date_of_birth'), '')::date, (payload->>'phone'),
    (payload->>'school_type'), (payload->>'school_name'),
    NULLIF(trim(payload->>'school_kcode'), ''),
    (payload->>'faculty_name'), (payload->>'department_name'),
    (payload->>'major_field'), (payload->>'graduation_year')::int,
    CASE WHEN payload->'desired_industry' IS NULL THEN NULL
         ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'desired_industry')) END,
    CASE WHEN payload->'desired_job_type' IS NULL THEN NULL
         ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'desired_job_type')) END,
    (payload->>'referrer'), (payload->>'utm_source'), (payload->>'utm_medium'),
    (payload->>'utm_campaign'), (payload->>'utm_content'), (payload->>'utm_term')
  ) RETURNING id INTO v_candidate_id;

  -- profiles に名前と candidate_id を UPDATE
  UPDATE public.profiles
  SET candidate_id = v_candidate_id,
      last_name = (payload->>'last_name'),
      first_name = (payload->>'first_name'),
      last_name_kana = (payload->>'last_name_kana'),
      first_name_kana = (payload->>'first_name_kana'),
      updated_at = now()
  WHERE id = v_uid;

  RETURN v_candidate_id;
END;
$$;

COMMENT ON FUNCTION public.create_candidate_and_link_profile(jsonb) IS '認証済みユーザーが自分用の candidates 行を 1 件作成し、profiles に名前と candidate_id を設定する。SECURITY DEFINER で RLS をバイパス。';
