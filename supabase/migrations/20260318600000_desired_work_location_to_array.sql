-- desired_work_location を text → text[] に変更（複数選択対応）
-- 既存データは単一値を1要素の配列に変換する

ALTER TABLE public.candidates
  ALTER COLUMN desired_work_location TYPE text[]
  USING CASE
    WHEN desired_work_location IS NULL THEN NULL
    ELSE ARRAY[desired_work_location]
  END;

COMMENT ON COLUMN public.candidates.desired_work_location IS '希望勤務地（複数選択）';

-- RPC: create_candidate_and_link_profile の desired_work_location を配列対応に更新
CREATE OR REPLACE FUNCTION public.create_candidate_and_link_profile(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_candidate_id uuid;
BEGIN
  v_user_id := (payload->>'user_id')::uuid;

  -- candidates に INSERT
  INSERT INTO public.candidates (
    gender, desired_work_location, date_of_birth, phone,
    school_type, school_name, school_kcode, faculty_name, department_name,
    major_field, graduation_year, desired_industry, desired_job_type,
    referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term
  ) VALUES (
    (payload->>'gender'),
    CASE WHEN payload->'desired_work_location' IS NULL THEN NULL
         ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'desired_work_location')) END,
    NULLIF(trim(payload->>'date_of_birth'), '')::date, (payload->>'phone'),
    (payload->>'school_type'), (payload->>'school_name'),
    NULLIF(trim(payload->>'school_kcode'), ''),
    NULLIF(trim(payload->>'faculty_name'), ''),
    NULLIF(trim(payload->>'department_name'), ''),
    (payload->>'major_field'), (payload->>'graduation_year')::int,
    CASE WHEN payload->'desired_industry' IS NULL THEN NULL
         ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'desired_industry')) END,
    CASE WHEN payload->'desired_job_type' IS NULL THEN NULL
         ELSE ARRAY(SELECT jsonb_array_elements_text(payload->'desired_job_type')) END,
    NULLIF(trim(payload->>'referrer'), ''),
    NULLIF(trim(payload->>'utm_source'), ''),
    NULLIF(trim(payload->>'utm_medium'), ''),
    NULLIF(trim(payload->>'utm_campaign'), ''),
    NULLIF(trim(payload->>'utm_content'), ''),
    NULLIF(trim(payload->>'utm_term'), '')
  )
  RETURNING id INTO v_candidate_id;

  -- profiles に名前・カナ・候補者紐付け
  UPDATE public.profiles
  SET
    first_name      = (payload->>'first_name'),
    last_name       = (payload->>'last_name'),
    first_name_kana = (payload->>'first_name_kana'),
    last_name_kana  = (payload->>'last_name_kana'),
    candidate_id    = v_candidate_id,
    role            = 'candidate'
  WHERE id = v_user_id;

  RETURN v_candidate_id;
END;
$$;
