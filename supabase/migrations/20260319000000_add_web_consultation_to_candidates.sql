-- candidates に web_consultation（就活お悩みWEB相談 希望フラグ）を追加
-- イベント予約とは別に、会員登録時の希望を管理する
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS web_consultation boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.candidates.web_consultation IS '就活お悩みWEB相談（無料）の希望フラグ。会員登録時に設定。';

-- RPC: create_candidate_and_link_profile に web_consultation を追加
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
    referrer, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    web_consultation
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
    NULLIF(trim(payload->>'utm_term'), ''),
    COALESCE((payload->>'web_consultation')::boolean, false)
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
