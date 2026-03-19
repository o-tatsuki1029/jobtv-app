


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."application_status" AS ENUM (
    'applied',
    'document_screening',
    'first_interview',
    'second_interview',
    'final_interview',
    'offer',
    'rejected',
    'withdrawn'
);


ALTER TYPE "public"."application_status" OWNER TO "postgres";


CREATE TYPE "public"."company_page_status" AS ENUM (
    'active',
    'closed'
);


ALTER TYPE "public"."company_page_status" OWNER TO "postgres";


CREATE TYPE "public"."company_status" AS ENUM (
    'active',
    'closed'
);


ALTER TYPE "public"."company_status" OWNER TO "postgres";


CREATE TYPE "public"."draft_status" AS ENUM (
    'draft',
    'submitted',
    'approved',
    'rejected'
);


ALTER TYPE "public"."draft_status" OWNER TO "postgres";


CREATE TYPE "public"."job_status" AS ENUM (
    'active',
    'closed'
);


ALTER TYPE "public"."job_status" OWNER TO "postgres";


CREATE TYPE "public"."session_status" AS ENUM (
    'active',
    'closed'
);


ALTER TYPE "public"."session_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'recruiter',
    'candidate'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."video_category" AS ENUM (
    'main',
    'short',
    'documentary'
);


ALTER TYPE "public"."video_category" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_candidate_attended_event"("p_event_id" "uuid", "p_candidate_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.event_reservations
    WHERE event_id = p_event_id
      AND candidate_id = p_candidate_id
      AND attended = true
  );
END;
$$;


ALTER FUNCTION "public"."check_candidate_attended_event"("p_event_id" "uuid", "p_candidate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_candidate_in_company_event"("p_candidate_id" "uuid", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.event_reservations er
    INNER JOIN public.event_companies ec ON er.event_id = ec.event_id
    WHERE er.candidate_id = p_candidate_id
      AND ec.company_id = p_company_id
      AND er.attended = true
  );
END;
$$;


ALTER FUNCTION "public"."check_candidate_in_company_event"("p_candidate_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_company_in_event"("p_event_id" "uuid", "p_company_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.event_companies
    WHERE event_id = p_event_id
      AND company_id = p_company_id
  );
END;
$$;


ALTER FUNCTION "public"."check_company_in_event"("p_event_id" "uuid", "p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_candidate_and_link_profile"("payload" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_candidate_and_link_profile"("payload" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_candidate_and_link_profile"("payload" "jsonb") IS '認証済みユーザーが自分用の candidates 行を 1 件作成し、profiles に名前と candidate_id を設定する。SECURITY DEFINER で RLS をバイパス。';



CREATE OR REPLACE FUNCTION "public"."get_company_reservation_count_for_dates"("p_session_date_ids" "uuid"[]) RETURNS bigint
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_company_reservation_count_for_dates"("p_session_date_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_company_reservation_count_for_dates"("p_session_date_ids" "uuid"[]) IS '自社に属する session_date のうち、指定 id に紐づく予約件数を返す（RLS バイパス・デバッグ用）。';



CREATE OR REPLACE FUNCTION "public"."get_company_session_reservations"("p_session_id" "uuid" DEFAULT NULL::"uuid", "p_limit" integer DEFAULT 100) RETURNS TABLE("id" "uuid", "session_date_id" "uuid", "candidate_id" "uuid", "status" "text", "attended" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "event_date" "date", "start_time" time without time zone, "end_time" time without time zone, "session_id" "uuid", "session_title" "text", "last_name" "text", "first_name" "text", "last_name_kana" "text", "first_name_kana" "text", "phone" "text", "school_name" "text", "gender" "text", "graduation_year" integer, "email" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_company_session_reservations"("p_session_id" "uuid", "p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_company_session_reservations"("p_session_id" "uuid", "p_limit" integer) IS '企業担当者・管理者が予約一覧を取得する。SECURITY DEFINER で RLS をバイパスし、自社（admin の場合は全社）の予約を返す。';



CREATE OR REPLACE FUNCTION "public"."get_public_session_date_reservation_counts"("session_date_ids" "uuid"[]) RETURNS TABLE("session_date_id" "uuid", "reservation_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT sd.id AS session_date_id, count(sr.id)::bigint AS reservation_count
  FROM session_dates sd
  INNER JOIN sessions s ON s.id = sd.session_id AND s.status = 'active'
  LEFT JOIN session_reservations sr ON sr.session_date_id = sd.id AND sr.status = 'reserved'
  WHERE sd.id = ANY(session_date_ids)
  GROUP BY sd.id;
$$;


ALTER FUNCTION "public"."get_public_session_date_reservation_counts"("session_date_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_public_session_date_reservation_counts"("session_date_ids" "uuid"[]) IS '公開中の説明会について、指定した日程IDごとの予約数（reserved のみ）を返す。anon でも実行可能。';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_role public.user_role;
  user_role_value public.user_role;
BEGIN
  -- profilesテーブルに同じメールアドレスの既存レコードがあるか確認
  -- リクルーター作成時に先にprofilesに登録されている場合があるため
  BEGIN
    SELECT role INTO existing_role
    FROM public.profiles
    WHERE email = NEW.email
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      existing_role := NULL;
  END;

  -- 既存のroleがある場合はそれを使用、なければ candidate（公開登録は求職者のみ）
  user_role_value := COALESCE(
    existing_role,
    'candidate'::public.user_role
  );

  BEGIN
    INSERT INTO public.profiles (id, email, role, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      user_role_value,
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = NEW.email,
        role = user_role_value,
        updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'handle_new_user trigger error for user % (email: %): % (SQLSTATE: %)',
        NEW.id, NEW.email, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user trigger fatal error for user % (email: %): % (SQLSTATE: %)',
      NEW.id, NEW.email, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."session_date_belongs_to_current_user_company"("p_session_date_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN sessions s ON s.company_id = p.company_id
    INNER JOIN session_dates sd ON sd.session_id = s.id AND sd.id = p_session_date_id
    WHERE p.id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."session_date_belongs_to_current_user_company"("p_session_date_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."session_date_belongs_to_current_user_company"("p_session_date_id" "uuid") IS '指定した session_date が、現在のユーザー（企業）の説明会に属するか。RLS をバイパスして判定する。';



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_application_progress_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_application_progress_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ca_interviews_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_ca_interviews_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_companies_draft_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_companies_draft_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_postings_draft_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_job_postings_draft_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_phone_call_list_items_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_phone_call_list_items_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_phone_call_lists_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_phone_call_lists_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_phone_calls_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_phone_calls_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_dates_draft_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_session_dates_draft_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_dates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_session_dates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_session_reservations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_session_reservations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sessions_draft_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sessions_draft_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_sessions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_sessions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_line_user_ids" (
    "profile_id" "uuid" NOT NULL,
    "line_user_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_line_user_ids" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."application_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "status" "public"."application_status" NOT NULL,
    "status_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "previous_status" "public"."application_status"
);


ALTER TABLE "public"."application_progress" OWNER TO "postgres";


COMMENT ON COLUMN "public"."application_progress"."previous_status" IS '変更前のステータス（最初のレコードはNULL）';



CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "job_posting_id" "uuid" NOT NULL,
    "recruiter_id" "uuid",
    "current_status" "public"."application_status" DEFAULT 'applied'::"public"."application_status" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ca_interviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "interview_date" timestamp with time zone NOT NULL,
    "interviewer_id" "uuid",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."ca_interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidate_management" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "notes" "text",
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."candidate_management" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "phone" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "graduation_year" integer,
    "gender" "text",
    "school_name" "text" DEFAULT ''::"text",
    "school_type" "text",
    "major_field" "text",
    "entry_channel" "text",
    "referrer" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "desired_work_location" "text",
    "date_of_birth" "date",
    "jobtv_id" "text",
    "faculty_name" "text",
    "department_name" "text",
    "desired_industry" "text"[],
    "desired_job_type" "text"[],
    "line_user_id" "text",
    "school_kcode" "text"
);


ALTER TABLE "public"."candidates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."candidates"."phone" IS '電話番号（ハイフンなしで統一）';



COMMENT ON COLUMN "public"."candidates"."gender" IS '性別（男性、女性、その他）';



COMMENT ON COLUMN "public"."candidates"."desired_work_location" IS '居住地';



COMMENT ON COLUMN "public"."candidates"."date_of_birth" IS '生年月日';



COMMENT ON COLUMN "public"."candidates"."jobtv_id" IS 'JOBTVサービスとの連携用ID（将来的なAPI連携用）';



COMMENT ON COLUMN "public"."candidates"."faculty_name" IS '学部名';



COMMENT ON COLUMN "public"."candidates"."department_name" IS '学科名';



COMMENT ON COLUMN "public"."candidates"."desired_industry" IS '興味のある業界（複数選択）';



COMMENT ON COLUMN "public"."candidates"."desired_job_type" IS '興味のある職種（複数選択）';



COMMENT ON COLUMN "public"."candidates"."line_user_id" IS 'LINE Login で取得した userId。連携済みの場合のみ設定。';



CREATE TABLE IF NOT EXISTS "public"."comment_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "template_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comment_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "logo_url" "text",
    "industry" "text",
    "employees" "text",
    "representative" "text",
    "established" "text",
    "website" "text",
    "address_line1" "text",
    "address_line2" "text",
    "company_info" "text",
    "status" "public"."company_status" DEFAULT 'active'::"public"."company_status",
    "prefecture" "text",
    "thumbnail_url" "text"
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON COLUMN "public"."companies"."status" IS 'ステータス（active: 公開中、closed: 非公開）';



COMMENT ON COLUMN "public"."companies"."prefecture" IS '都道府県';



COMMENT ON COLUMN "public"."companies"."thumbnail_url" IS 'トップページ企業カード用サムネイル画像URL。未設定時はlogo_urlを使用';



CREATE TABLE IF NOT EXISTS "public"."companies_draft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "company_info" "text",
    "logo_url" "text",
    "website" "text",
    "address_line1" "text",
    "address_line2" "text",
    "established" "text",
    "employees" "text",
    "representative" "text",
    "industry" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "draft_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "production_company_id" "uuid",
    "company_id" "uuid" NOT NULL,
    "prefecture" "text",
    "thumbnail_url" "text"
);


ALTER TABLE "public"."companies_draft" OWNER TO "postgres";


COMMENT ON TABLE "public"."companies_draft" IS '企業情報の下書きテーブル（審査前の状態を保持）';



COMMENT ON COLUMN "public"."companies_draft"."draft_status" IS '下書きステータス（draft: 編集中、submitted: 審査申請済み、approved: 承認済み、rejected: 却下済み）';



COMMENT ON COLUMN "public"."companies_draft"."prefecture" IS '都道府県';



COMMENT ON COLUMN "public"."companies_draft"."thumbnail_url" IS 'トップページ企業カード用サムネイル画像URL（ドラフト）';



CREATE TABLE IF NOT EXISTS "public"."company_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tagline" "text",
    "description" "text",
    "cover_image_url" "text",
    "main_video_url" "text",
    "sns_x_url" "text",
    "sns_instagram_url" "text",
    "sns_tiktok_url" "text",
    "sns_youtube_url" "text",
    "short_videos" "jsonb" DEFAULT '[]'::"jsonb",
    "documentary_videos" "jsonb" DEFAULT '[]'::"jsonb",
    "company_videos" "jsonb" DEFAULT '[]'::"jsonb",
    "benefits" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."company_page_status" DEFAULT 'active'::"public"."company_page_status" NOT NULL
);


ALTER TABLE "public"."company_pages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."company_pages"."status" IS 'ステータス（active: 公開中、closed: 非公開）';



CREATE TABLE IF NOT EXISTS "public"."company_pages_draft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "tagline" "text",
    "description" "text",
    "cover_image_url" "text",
    "main_video_url" "text",
    "sns_x_url" "text",
    "sns_instagram_url" "text",
    "sns_tiktok_url" "text",
    "sns_youtube_url" "text",
    "short_videos" "jsonb" DEFAULT '[]'::"jsonb",
    "documentary_videos" "jsonb" DEFAULT '[]'::"jsonb",
    "company_videos" "jsonb" DEFAULT '[]'::"jsonb",
    "benefits" "text"[] DEFAULT ARRAY[]::"text"[],
    "draft_status" "public"."draft_status" DEFAULT 'draft'::"public"."draft_status" NOT NULL,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "production_page_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."company_pages_draft" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_name" "text" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "status" "text" NOT NULL,
    "sendgrid_message_id" "text",
    "error_message" "text",
    "slack_notified" boolean DEFAULT false NOT NULL,
    "variables_snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_logs_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_logs" IS '不変の送付ログ。INSERT/UPDATE はサービスロールのみ。admin は SELECT のみ。';



COMMENT ON COLUMN "public"."email_logs"."template_name" IS '送付時点でのテンプレート名スナップショット';



COMMENT ON COLUMN "public"."email_logs"."variables_snapshot" IS '送付時点でのレンダリング変数（デバッグ用）';



CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "body_text" "text",
    "variables" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_templates" IS 'Admin が管理する SendGrid メールテンプレート。変数は {variable_name} 記法。';



COMMENT ON COLUMN "public"."email_templates"."name" IS 'ユニークなスラッグ: invite_recruiter | invite_team_member | signup_confirmation | password_reset';



COMMENT ON COLUMN "public"."email_templates"."variables" IS 'テンプレートで使用可能な変数名の一覧例: {first_name, invite_url}';



CREATE TABLE IF NOT EXISTS "public"."event_areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_areas" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_areas" IS 'エリアマスタ';



COMMENT ON COLUMN "public"."event_areas"."name" IS 'エリア名';



COMMENT ON COLUMN "public"."event_areas"."is_active" IS '有効フラグ';



CREATE TABLE IF NOT EXISTS "public"."event_companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_graduation_years" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."event_graduation_years" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_graduation_years" IS '卒年度マスタ';



COMMENT ON COLUMN "public"."event_graduation_years"."year" IS '卒年度';



COMMENT ON COLUMN "public"."event_graduation_years"."is_active" IS '有効フラグ';



CREATE TABLE IF NOT EXISTS "public"."event_matching_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "session_count" integer NOT NULL,
    "candidate_weight" numeric(3,2) DEFAULT 0.50 NOT NULL,
    "company_weight" numeric(3,2) DEFAULT 0.50 NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "special_interviews" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_matching_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."event_matching_sessions"."candidate_weight" IS '学生評価の重み付け（0.0-1.0）';



CREATE TABLE IF NOT EXISTS "public"."event_ratings_candidate_to_company" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ratings_candidate_to_company_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."event_ratings_candidate_to_company" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_ratings_recruiter_to_candidate" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "recruiter_id" "uuid",
    "overall_rating" integer,
    "communication_rating" integer,
    "cooperation_rating" integer,
    "logic_rating" integer,
    "creative_rating" integer,
    "initiative_rating" integer,
    "comment" "text",
    "evaluator_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "memo" "text",
    CONSTRAINT "ratings_recruiter_to_candidate_communication_rating_check" CHECK ((("communication_rating" >= 1) AND ("communication_rating" <= 5))),
    CONSTRAINT "ratings_recruiter_to_candidate_cooperation_rating_check" CHECK ((("cooperation_rating" >= 1) AND ("cooperation_rating" <= 5))),
    CONSTRAINT "ratings_recruiter_to_candidate_creative_rating_check" CHECK ((("creative_rating" >= 1) AND ("creative_rating" <= 5))),
    CONSTRAINT "ratings_recruiter_to_candidate_initiative_rating_check" CHECK ((("initiative_rating" >= 1) AND ("initiative_rating" <= 5))),
    CONSTRAINT "ratings_recruiter_to_candidate_logic_rating_check" CHECK ((("logic_rating" >= 1) AND ("logic_rating" <= 5))),
    CONSTRAINT "ratings_recruiter_to_candidate_overall_rating_check" CHECK ((("overall_rating" >= 1) AND ("overall_rating" <= 4)))
);


ALTER TABLE "public"."event_ratings_recruiter_to_candidate" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "seat_number" "text",
    "status" "text" DEFAULT 'reserved'::"text" NOT NULL,
    "attended" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_content" "text",
    "utm_term" "text",
    "referrer" "text",
    "web_consultation" boolean DEFAULT false NOT NULL,
    "last_reminder_sent_at" timestamp with time zone
);


ALTER TABLE "public"."event_reservations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."event_reservations"."utm_source" IS 'UTMソース（広告の出所）';



COMMENT ON COLUMN "public"."event_reservations"."utm_medium" IS 'UTMメディア（広告の媒体）';



COMMENT ON COLUMN "public"."event_reservations"."utm_campaign" IS 'UTMキャンペーン（広告キャンペーン名）';



COMMENT ON COLUMN "public"."event_reservations"."utm_content" IS 'UTMコンテンツ（広告の内容識別子）';



COMMENT ON COLUMN "public"."event_reservations"."utm_term" IS 'UTMターム（広告のキーワード）';



COMMENT ON COLUMN "public"."event_reservations"."referrer" IS 'リファラー（参照元URL）';



COMMENT ON COLUMN "public"."event_reservations"."web_consultation" IS '就活お悩みWEB相談を希望するかどうか';



COMMENT ON COLUMN "public"."event_reservations"."last_reminder_sent_at" IS 'リマインドメール最終送信日時（重複送信防止用）';



CREATE TABLE IF NOT EXISTS "public"."event_special_interviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "session_number" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."event_special_interviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "target_graduation_year" integer,
    "area" "text"
);


ALTER TABLE "public"."event_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_types" IS 'イベントタイプマスタ';



COMMENT ON COLUMN "public"."event_types"."name" IS 'イベント名';



COMMENT ON COLUMN "public"."event_types"."is_active" IS '有効フラグ';



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "event_type_id" "uuid",
    "venue_name" "text",
    "gathering_time" time without time zone,
    "display_name" "text",
    "target_attendance" integer,
    "venue_address" "text",
    "google_maps_url" "text",
    "form_label" "text",
    "form_area" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "events_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


COMMENT ON COLUMN "public"."events"."venue_name" IS '会場名（例: 東京/赤坂ガーデンシティ）';



COMMENT ON COLUMN "public"."events"."gathering_time" IS '集合時間';



COMMENT ON COLUMN "public"."events"."display_name" IS 'フロント表示用イベント名（NULL → event_types.name にフォールバック）';



COMMENT ON COLUMN "public"."events"."target_attendance" IS '集客目標数（admin 管理用、定員制限なし）';



COMMENT ON COLUMN "public"."events"."venue_address" IS '会場住所';



COMMENT ON COLUMN "public"."events"."google_maps_url" IS 'Google マップ URL';



COMMENT ON COLUMN "public"."events"."form_label" IS 'フォーム表示用ラベル（NULL → event_types.name にフォールバック）';



COMMENT ON COLUMN "public"."events"."form_area" IS 'フォーム表示用エリア（NULL → event_types.area にフォールバック）';



COMMENT ON COLUMN "public"."events"."status" IS 'イベントステータス: active / paused / cancelled';



COMMENT ON COLUMN "public"."events"."deleted_at" IS '論理削除日時。NULLでない場合は削除済み';



CREATE TABLE IF NOT EXISTS "public"."job_postings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."job_status" DEFAULT 'active'::"public"."job_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "graduation_year" integer NOT NULL,
    "available_statuses" "public"."application_status"[] DEFAULT ARRAY['applied'::"public"."application_status", 'document_screening'::"public"."application_status", 'first_interview'::"public"."application_status", 'second_interview'::"public"."application_status", 'final_interview'::"public"."application_status", 'offer'::"public"."application_status", 'rejected'::"public"."application_status", 'withdrawn'::"public"."application_status"] NOT NULL,
    "employment_type" "text",
    "location" "text",
    "requirements" "text",
    "benefits" "text",
    "selection_process" "text",
    "prefecture" "text",
    "location_detail" "text",
    "cover_image_url" "text",
    "display_order" integer DEFAULT 0
);


ALTER TABLE "public"."job_postings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."job_postings"."status" IS 'ステータス（active: 公開中、closed: 非公開）';



COMMENT ON COLUMN "public"."job_postings"."employment_type" IS '雇用形態（正社員、契約社員、業務委託、インターンなど）';



COMMENT ON COLUMN "public"."job_postings"."location" IS '勤務地';



COMMENT ON COLUMN "public"."job_postings"."requirements" IS '応募資格';



COMMENT ON COLUMN "public"."job_postings"."benefits" IS '福利厚生・制度';



COMMENT ON COLUMN "public"."job_postings"."selection_process" IS '選考フロー';



COMMENT ON COLUMN "public"."job_postings"."prefecture" IS '都道府県';



COMMENT ON COLUMN "public"."job_postings"."location_detail" IS '勤務地詳細（例：東京都港区、リモート可など）';



COMMENT ON COLUMN "public"."job_postings"."cover_image_url" IS '求人のカバー画像URL';



COMMENT ON COLUMN "public"."job_postings"."display_order" IS '表示順序（0から始まる整数、小さいほど先に表示）';



CREATE TABLE IF NOT EXISTS "public"."job_postings_draft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "employment_type" "text",
    "prefecture" "text",
    "location_detail" "text",
    "graduation_year" integer NOT NULL,
    "requirements" "text",
    "benefits" "text",
    "selection_process" "text",
    "cover_image_url" "text",
    "available_statuses" "public"."application_status"[] DEFAULT ARRAY['applied'::"public"."application_status", 'offer'::"public"."application_status", 'rejected'::"public"."application_status", 'withdrawn'::"public"."application_status"] NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "draft_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "production_job_id" "uuid",
    "display_order" integer DEFAULT 0
);


ALTER TABLE "public"."job_postings_draft" OWNER TO "postgres";


COMMENT ON TABLE "public"."job_postings_draft" IS '求人の下書きテーブル（審査前の状態を保持）';



COMMENT ON COLUMN "public"."job_postings_draft"."draft_status" IS '下書きステータス（draft: 編集中、submitted: 審査申請済み、approved: 承認済み、rejected: 却下済み）';



COMMENT ON COLUMN "public"."job_postings_draft"."display_order" IS '表示順序（0から始まる整数、小さいほど先に表示）';



CREATE TABLE IF NOT EXISTS "public"."line_broadcast_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "broadcast_log_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "line_user_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_code" "text",
    "error_message" "text",
    "retry_count" integer DEFAULT 0 NOT NULL,
    "last_attempted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_broadcast_deliveries_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'success'::"text", 'failed'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."line_broadcast_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_broadcast_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "filters_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "messages_snapshot" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "target_count" integer DEFAULT 0 NOT NULL,
    "sent_count" integer DEFAULT 0 NOT NULL,
    "failed_count" integer DEFAULT 0 NOT NULL,
    "blocked_count" integer DEFAULT 0 NOT NULL,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_by" "uuid",
    "template_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_broadcast_logs_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'scheduled'::"text", 'sending'::"text", 'sent'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."line_broadcast_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."line_message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "messages_json" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "builder_state_json" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "line_message_templates_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'bubble'::"text", 'carousel'::"text", 'image'::"text", 'imagemap'::"text"])))
);


ALTER TABLE "public"."line_message_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lp_company_logos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "row_position" "text" DEFAULT 'top'::"text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "lp_company_logos_row_position_check" CHECK (("row_position" = ANY (ARRAY['top'::"text", 'bottom'::"text"])))
);


ALTER TABLE "public"."lp_company_logos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lp_faq_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question" "text" NOT NULL,
    "answer" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lp_faq_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lp_sample_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_url" "text" NOT NULL,
    "tag" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "duration" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thumbnail_url" "text"
);


ALTER TABLE "public"."lp_sample_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lp_scroll_banner" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "image_url" "text" NOT NULL,
    "link_url" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lp_scroll_banner" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matching_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "matching_session_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "session_number" integer NOT NULL,
    "is_special_interview" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."matching_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'info'::"text" NOT NULL,
    "target_company_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_call_list_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "list_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."phone_call_list_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_call_lists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."phone_call_lists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phone_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "call_date" timestamp with time zone NOT NULL,
    "caller_id" "uuid",
    "call_type" "text" DEFAULT 'outgoing'::"text" NOT NULL,
    "duration" integer,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."phone_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."user_role" DEFAULT 'candidate'::"public"."user_role",
    "email" "text",
    "company_id" "uuid",
    "last_name" "text",
    "first_name" "text",
    "last_name_kana" "text",
    "first_name_kana" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "candidate_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'ユーザープロファイルテーブル（auth.usersと同期）';



COMMENT ON COLUMN "public"."profiles"."updated_at" IS 'レコード更新日時';



COMMENT ON COLUMN "public"."profiles"."company_id" IS '企業担当者の所属企業ID（recruiter/RA/CA/MRK ロールの場合に使用）';



COMMENT ON COLUMN "public"."profiles"."last_name" IS 'リクルーターの姓';



COMMENT ON COLUMN "public"."profiles"."first_name" IS 'リクルーターの名';



COMMENT ON COLUMN "public"."profiles"."last_name_kana" IS 'リクルーターの姓カナ';



COMMENT ON COLUMN "public"."profiles"."first_name_kana" IS 'リクルーターの名カナ';



COMMENT ON COLUMN "public"."profiles"."created_at" IS 'レコード作成日時';



COMMENT ON COLUMN "public"."profiles"."deleted_at" IS '論理削除日時。NULLの場合は有効なアカウント';



COMMENT ON COLUMN "public"."profiles"."candidate_id" IS '求職者本人に紐づく candidates.id。candidate ロールのときのみ設定。';



CREATE TABLE IF NOT EXISTS "public"."school_master" (
    "id" bigint NOT NULL,
    "school_kcode" "text" NOT NULL,
    "school_type" "text" NOT NULL,
    "school_name" "text" NOT NULL,
    "school_name_hira" "text",
    "prefecture" "text",
    "group_name" "text",
    "faculty_name" "text",
    "faculty_name_hira" "text",
    "department_name" "text",
    "department_name_hira" "text"
);


ALTER TABLE "public"."school_master" OWNER TO "postgres";


ALTER TABLE "public"."school_master" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."school_master_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."session_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "capacity" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_dates" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_dates" IS '説明会日程管理テーブル';



COMMENT ON COLUMN "public"."session_dates"."session_id" IS '説明会ID';



COMMENT ON COLUMN "public"."session_dates"."event_date" IS '開催日';



COMMENT ON COLUMN "public"."session_dates"."start_time" IS '開始時間';



COMMENT ON COLUMN "public"."session_dates"."end_time" IS '終了時間';



COMMENT ON COLUMN "public"."session_dates"."capacity" IS '定員（この日程の定員、NULLの場合は説明会の定員を使用）';



CREATE TABLE IF NOT EXISTS "public"."session_dates_draft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_draft_id" "uuid" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "capacity" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_dates_draft" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_dates_draft" IS '説明会日程ドラフト管理テーブル';



COMMENT ON COLUMN "public"."session_dates_draft"."session_draft_id" IS '説明会ドラフトID';



COMMENT ON COLUMN "public"."session_dates_draft"."event_date" IS '開催日';



COMMENT ON COLUMN "public"."session_dates_draft"."start_time" IS '開始時間';



COMMENT ON COLUMN "public"."session_dates_draft"."end_time" IS '終了時間';



COMMENT ON COLUMN "public"."session_dates_draft"."capacity" IS '定員（この日程の定員、NULLの場合は説明会の定員を使用）';



CREATE TABLE IF NOT EXISTS "public"."session_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_date_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'reserved'::"text" NOT NULL,
    "attended" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "location_type" "text",
    "location_detail" "text",
    "capacity" integer,
    "status" "public"."session_status" DEFAULT 'active'::"public"."session_status" NOT NULL,
    "cover_image_url" "text",
    "description" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "graduation_year" integer,
    "display_order" integer DEFAULT 0
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."sessions" IS '説明会・イベント管理テーブル';



COMMENT ON COLUMN "public"."sessions"."title" IS 'タイトル';



COMMENT ON COLUMN "public"."sessions"."type" IS '種類（勉強会、説明会、セミナー、その他）';



COMMENT ON COLUMN "public"."sessions"."location_type" IS '場所タイプ（オンライン、オフライン、ハイブリッド）';



COMMENT ON COLUMN "public"."sessions"."location_detail" IS '場所詳細';



COMMENT ON COLUMN "public"."sessions"."capacity" IS '定員（全体の定員、各日程で個別に設定することも可能）';



COMMENT ON COLUMN "public"."sessions"."status" IS 'ステータス（active: 公開中、closed: 終了）';



COMMENT ON COLUMN "public"."sessions"."cover_image_url" IS 'カバー画像URL';



COMMENT ON COLUMN "public"."sessions"."description" IS '説明文（必須）';



COMMENT ON COLUMN "public"."sessions"."graduation_year" IS '対象卒年度';



COMMENT ON COLUMN "public"."sessions"."display_order" IS '表示順序（0から始まる整数、小さいほど先に表示）';



CREATE TABLE IF NOT EXISTS "public"."sessions_draft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "location_type" "text",
    "location_detail" "text",
    "capacity" integer,
    "description" "text" NOT NULL,
    "cover_image_url" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "draft_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "production_session_id" "uuid",
    "graduation_year" integer,
    "display_order" integer DEFAULT 0
);


ALTER TABLE "public"."sessions_draft" OWNER TO "postgres";


COMMENT ON TABLE "public"."sessions_draft" IS '説明会の下書きテーブル（審査前の状態を保持）';



COMMENT ON COLUMN "public"."sessions_draft"."draft_status" IS '下書きステータス（draft: 編集中、submitted: 審査申請済み、approved: 承認済み、rejected: 却下済み）';



COMMENT ON COLUMN "public"."sessions_draft"."graduation_year" IS '対象卒年度';



COMMENT ON COLUMN "public"."sessions_draft"."display_order" IS '表示順序（0から始まる整数、小さいほど先に表示）';



CREATE TABLE IF NOT EXISTS "public"."storage_cleanup_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scan_from" timestamp with time zone NOT NULL,
    "scan_to" timestamp with time zone NOT NULL,
    "scheduled_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "result" "jsonb",
    CONSTRAINT "storage_cleanup_schedules_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'running'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."storage_cleanup_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."storage_deletion_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "storage_type" "text" NOT NULL,
    "bucket" "text" NOT NULL,
    "path" "text" NOT NULL,
    "is_prefix" boolean DEFAULT false NOT NULL,
    "source" "text" NOT NULL,
    "source_detail" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    "error_message" "text",
    CONSTRAINT "storage_deletion_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "storage_deletion_queue_storage_type_check" CHECK (("storage_type" = ANY (ARRAY['s3'::"text", 'supabase'::"text"])))
);


ALTER TABLE "public"."storage_deletion_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."top_page_ambassadors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "avatar_url" "text" NOT NULL,
    "link_url" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."top_page_ambassadors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."top_page_banners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "image_url" "text" NOT NULL,
    "link_url" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."top_page_banners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."top_page_documentaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "thumbnail_url" "text" NOT NULL,
    "link_url" "text",
    "channel" "text" DEFAULT 'JOBTV'::"text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."top_page_documentaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."top_page_featured_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "top_page_featured_videos_kind_check" CHECK (("kind" = ANY (ARRAY['short'::"text", 'documentary'::"text"])))
);


ALTER TABLE "public"."top_page_featured_videos" OWNER TO "postgres";


COMMENT ON TABLE "public"."top_page_featured_videos" IS 'トップページに表示する動画の選択。admin が選択した動画のみ表示。入稿ではなく既存の videos を参照する。';



COMMENT ON COLUMN "public"."top_page_featured_videos"."kind" IS 'short: 就活Shorts, documentary: 就活ドキュメンタリー';



COMMENT ON COLUMN "public"."top_page_featured_videos"."display_order" IS '表示順（昇順）';



CREATE TABLE IF NOT EXISTS "public"."top_page_hero_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thumbnail_url" "text",
    "video_url" "text",
    "is_pr" boolean DEFAULT false NOT NULL,
    "link_url" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "auto_thumbnail_url" "text",
    "is_converted" boolean DEFAULT true NOT NULL,
    "mediaconvert_job_id" "text"
);


ALTER TABLE "public"."top_page_hero_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."top_page_shun_diaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "thumbnail_url" "text" NOT NULL,
    "link_url" "text",
    "channel" "text" DEFAULT 'しゅんダイアリー'::"text" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."top_page_shun_diaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "video_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "category" "public"."video_category" NOT NULL,
    "status" "public"."company_page_status" DEFAULT 'closed'::"public"."company_page_status" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_url" "text",
    "streaming_url" "text",
    "auto_thumbnail_url" "text"
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


COMMENT ON TABLE "public"."videos" IS '動画マスターテーブル（本番公開用）';



COMMENT ON COLUMN "public"."videos"."category" IS 'main: メインビデオ, short: ショート動画, documentary: 動画';



COMMENT ON COLUMN "public"."videos"."source_url" IS 'アップロード元の動画ファイルURL（CloudFront経由）';



COMMENT ON COLUMN "public"."videos"."streaming_url" IS 'HLSストリーミングURL（MediaConvert変換後）';



COMMENT ON COLUMN "public"."videos"."auto_thumbnail_url" IS 'MediaConvert Frame Captureで自動生成されたサムネイルURL';



CREATE TABLE IF NOT EXISTS "public"."videos_draft" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "production_video_id" "uuid",
    "title" "text" NOT NULL,
    "video_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "category" "public"."video_category" NOT NULL,
    "draft_status" "public"."draft_status" DEFAULT 'draft'::"public"."draft_status" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "conversion_status" "text" DEFAULT 'pending'::"text",
    "mediaconvert_job_id" "text",
    "streaming_url" "text",
    "aspect_ratio" "text" DEFAULT 'landscape'::"text",
    "auto_thumbnail_url" "text",
    CONSTRAINT "videos_draft_aspect_ratio_check" CHECK (("aspect_ratio" = ANY (ARRAY['landscape'::"text", 'portrait'::"text"])))
);


ALTER TABLE "public"."videos_draft" OWNER TO "postgres";


COMMENT ON TABLE "public"."videos_draft" IS '動画下書きテーブル（審査用）';



COMMENT ON COLUMN "public"."videos_draft"."category" IS 'main: メインビデオ, short: ショート動画, documentary: 動画';



COMMENT ON COLUMN "public"."videos_draft"."conversion_status" IS '動画変換ステータス: pending, processing, completed, failed';



COMMENT ON COLUMN "public"."videos_draft"."mediaconvert_job_id" IS 'AWS MediaConvertジョブID';



COMMENT ON COLUMN "public"."videos_draft"."streaming_url" IS 'HLSマニフェストURL（変換完了後に設定）';



COMMENT ON COLUMN "public"."videos_draft"."aspect_ratio" IS '動画のアスペクト比（landscape: 横長, portrait: 縦長）。MediaConvert変換テンプレートとS3出力パスの選択に使用する。';



COMMENT ON COLUMN "public"."videos_draft"."auto_thumbnail_url" IS 'MediaConvert Frame Captureで自動生成されたサムネイルURL';



ALTER TABLE ONLY "public"."admin_line_user_ids"
    ADD CONSTRAINT "admin_line_user_ids_pkey" PRIMARY KEY ("profile_id");



ALTER TABLE ONLY "public"."application_progress"
    ADD CONSTRAINT "application_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_candidate_id_job_posting_id_key" UNIQUE ("candidate_id", "job_posting_id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "ca_interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_management"
    ADD CONSTRAINT "candidate_management_candidate_id_key" UNIQUE ("candidate_id");



ALTER TABLE ONLY "public"."candidate_management"
    ADD CONSTRAINT "candidate_management_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_line_user_id_key" UNIQUE ("line_user_id");



ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comment_templates"
    ADD CONSTRAINT "comment_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies_draft"
    ADD CONSTRAINT "companies_draft_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_pages"
    ADD CONSTRAINT "company_pages_company_id_key" UNIQUE ("company_id");



ALTER TABLE ONLY "public"."company_pages_draft"
    ADD CONSTRAINT "company_pages_draft_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_pages"
    ADD CONSTRAINT "company_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_companies"
    ADD CONSTRAINT "event_companies_event_id_company_id_key" UNIQUE ("event_id", "company_id");



ALTER TABLE ONLY "public"."event_companies"
    ADD CONSTRAINT "event_companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_reservations"
    ADD CONSTRAINT "event_reservations_event_id_candidate_id_key" UNIQUE ("event_id", "candidate_id");



ALTER TABLE ONLY "public"."event_reservations"
    ADD CONSTRAINT "event_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_special_interviews"
    ADD CONSTRAINT "event_special_interviews_event_id_candidate_id_session_numb_key" UNIQUE ("event_id", "candidate_id", "session_number");



ALTER TABLE ONLY "public"."event_special_interviews"
    ADD CONSTRAINT "event_special_interviews_event_id_company_id_session_number_key" UNIQUE ("event_id", "company_id", "session_number");



ALTER TABLE ONLY "public"."event_special_interviews"
    ADD CONSTRAINT "event_special_interviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_types"
    ADD CONSTRAINT "event_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_postings_draft"
    ADD CONSTRAINT "job_postings_draft_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_broadcast_deliveries"
    ADD CONSTRAINT "line_broadcast_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_broadcast_logs"
    ADD CONSTRAINT "line_broadcast_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_message_templates"
    ADD CONSTRAINT "line_message_templates_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."line_message_templates"
    ADD CONSTRAINT "line_message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lp_company_logos"
    ADD CONSTRAINT "lp_company_logos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lp_faq_items"
    ADD CONSTRAINT "lp_faq_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lp_sample_videos"
    ADD CONSTRAINT "lp_sample_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lp_scroll_banner"
    ADD CONSTRAINT "lp_scroll_banner_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_areas"
    ADD CONSTRAINT "master_areas_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."event_areas"
    ADD CONSTRAINT "master_areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_types"
    ADD CONSTRAINT "master_event_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."event_graduation_years"
    ADD CONSTRAINT "master_graduation_years_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_graduation_years"
    ADD CONSTRAINT "master_graduation_years_year_key" UNIQUE ("year");



ALTER TABLE ONLY "public"."matching_results"
    ADD CONSTRAINT "matching_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_matching_sessions"
    ADD CONSTRAINT "matching_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_notification_id_user_id_key" UNIQUE ("notification_id", "user_id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_call_list_items"
    ADD CONSTRAINT "phone_call_list_items_list_id_candidate_id_key" UNIQUE ("list_id", "candidate_id");



ALTER TABLE ONLY "public"."phone_call_list_items"
    ADD CONSTRAINT "phone_call_list_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_call_lists"
    ADD CONSTRAINT "phone_call_lists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phone_calls"
    ADD CONSTRAINT "phone_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_candidate_id_unique" UNIQUE ("candidate_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_ratings_candidate_to_company"
    ADD CONSTRAINT "ratings_candidate_to_company_event_id_candidate_id_company__key" UNIQUE ("event_id", "candidate_id", "company_id");



ALTER TABLE ONLY "public"."event_ratings_candidate_to_company"
    ADD CONSTRAINT "ratings_candidate_to_company_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_ratings_recruiter_to_candidate"
    ADD CONSTRAINT "ratings_recruiter_to_candidat_event_id_candidate_id_company_key" UNIQUE ("event_id", "candidate_id", "company_id");



ALTER TABLE ONLY "public"."event_ratings_recruiter_to_candidate"
    ADD CONSTRAINT "ratings_recruiter_to_candidate_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."school_master"
    ADD CONSTRAINT "school_master_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_dates_draft"
    ADD CONSTRAINT "session_dates_draft_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_dates"
    ADD CONSTRAINT "session_dates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_reservations"
    ADD CONSTRAINT "session_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_reservations"
    ADD CONSTRAINT "session_reservations_session_date_id_candidate_id_key" UNIQUE ("session_date_id", "candidate_id");



ALTER TABLE ONLY "public"."sessions_draft"
    ADD CONSTRAINT "sessions_draft_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_cleanup_schedules"
    ADD CONSTRAINT "storage_cleanup_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."storage_deletion_queue"
    ADD CONSTRAINT "storage_deletion_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_page_ambassadors"
    ADD CONSTRAINT "top_page_ambassadors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_page_banners"
    ADD CONSTRAINT "top_page_banners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_page_documentaries"
    ADD CONSTRAINT "top_page_documentaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_page_featured_videos"
    ADD CONSTRAINT "top_page_featured_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_page_featured_videos"
    ADD CONSTRAINT "top_page_featured_videos_video_id_key" UNIQUE ("video_id");



ALTER TABLE ONLY "public"."top_page_hero_items"
    ADD CONSTRAINT "top_page_hero_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."top_page_shun_diaries"
    ADD CONSTRAINT "top_page_shun_diaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos_draft"
    ADD CONSTRAINT "videos_draft_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



CREATE INDEX "comment_templates_company_id_idx" ON "public"."comment_templates" USING "btree" ("company_id");



CREATE INDEX "event_companies_company_id_idx" ON "public"."event_companies" USING "btree" ("company_id");



CREATE INDEX "event_companies_event_id_idx" ON "public"."event_companies" USING "btree" ("event_id");



CREATE INDEX "event_reservations_attended_idx" ON "public"."event_reservations" USING "btree" ("attended");



CREATE INDEX "event_reservations_candidate_id_idx" ON "public"."event_reservations" USING "btree" ("candidate_id");



CREATE INDEX "event_reservations_event_id_idx" ON "public"."event_reservations" USING "btree" ("event_id");



CREATE INDEX "events_created_at_idx" ON "public"."events" USING "btree" ("created_at" DESC);



CREATE INDEX "events_event_date_idx" ON "public"."events" USING "btree" ("event_date");



CREATE INDEX "events_event_type_id_idx" ON "public"."events" USING "btree" ("event_type_id");



CREATE INDEX "idx_application_progress_application_id" ON "public"."application_progress" USING "btree" ("application_id");



CREATE INDEX "idx_application_progress_status_date" ON "public"."application_progress" USING "btree" ("status_date");



CREATE INDEX "idx_applications_candidate_id" ON "public"."applications" USING "btree" ("candidate_id");



CREATE INDEX "idx_applications_current_status" ON "public"."applications" USING "btree" ("current_status");



CREATE INDEX "idx_applications_job_posting_id" ON "public"."applications" USING "btree" ("job_posting_id");



CREATE INDEX "idx_applications_recruiter_id" ON "public"."applications" USING "btree" ("recruiter_id");



CREATE INDEX "idx_ca_interviews_candidate_id" ON "public"."ca_interviews" USING "btree" ("candidate_id");



CREATE INDEX "idx_ca_interviews_created_by" ON "public"."ca_interviews" USING "btree" ("created_by");



CREATE INDEX "idx_ca_interviews_interview_date" ON "public"."ca_interviews" USING "btree" ("interview_date");



CREATE INDEX "idx_ca_interviews_interviewer_id" ON "public"."ca_interviews" USING "btree" ("interviewer_id");



CREATE INDEX "idx_candidate_management_assigned_to" ON "public"."candidate_management" USING "btree" ("assigned_to");



CREATE INDEX "idx_candidate_management_candidate_id" ON "public"."candidate_management" USING "btree" ("candidate_id");



CREATE UNIQUE INDEX "idx_candidates_jobtv_id" ON "public"."candidates" USING "btree" ("jobtv_id") WHERE ("jobtv_id" IS NOT NULL);



CREATE INDEX "idx_candidates_line_user_id" ON "public"."candidates" USING "btree" ("line_user_id") WHERE ("line_user_id" IS NOT NULL);



CREATE INDEX "idx_companies_draft_company_id" ON "public"."companies_draft" USING "btree" ("company_id");



CREATE INDEX "idx_companies_draft_production_company_id" ON "public"."companies_draft" USING "btree" ("production_company_id");



CREATE INDEX "idx_companies_draft_status" ON "public"."companies_draft" USING "btree" ("draft_status");



CREATE INDEX "idx_company_pages_company_id" ON "public"."company_pages" USING "btree" ("company_id");



CREATE INDEX "idx_company_pages_draft_company_id" ON "public"."company_pages_draft" USING "btree" ("company_id");



CREATE INDEX "idx_company_pages_draft_draft_status" ON "public"."company_pages_draft" USING "btree" ("draft_status");



CREATE INDEX "idx_company_pages_draft_production_page_id" ON "public"."company_pages_draft" USING "btree" ("production_page_id");



CREATE INDEX "idx_company_pages_status" ON "public"."company_pages" USING "btree" ("status");



CREATE INDEX "idx_email_logs_created_at" ON "public"."email_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_email_logs_status" ON "public"."email_logs" USING "btree" ("status");



CREATE INDEX "idx_email_logs_template_name" ON "public"."email_logs" USING "btree" ("template_name");



CREATE INDEX "idx_events_not_deleted" ON "public"."events" USING "btree" ("event_date") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_job_postings_company_id" ON "public"."job_postings" USING "btree" ("company_id");



CREATE INDEX "idx_job_postings_display_order" ON "public"."job_postings" USING "btree" ("display_order");



CREATE INDEX "idx_job_postings_draft_company_id" ON "public"."job_postings_draft" USING "btree" ("company_id");



CREATE INDEX "idx_job_postings_draft_display_order" ON "public"."job_postings_draft" USING "btree" ("display_order");



CREATE INDEX "idx_job_postings_draft_production_job_id" ON "public"."job_postings_draft" USING "btree" ("production_job_id");



CREATE INDEX "idx_job_postings_draft_status" ON "public"."job_postings_draft" USING "btree" ("draft_status");



CREATE INDEX "idx_job_postings_status" ON "public"."job_postings" USING "btree" ("status");



CREATE INDEX "idx_line_broadcast_deliveries_log_id" ON "public"."line_broadcast_deliveries" USING "btree" ("broadcast_log_id");



CREATE INDEX "idx_line_broadcast_deliveries_retry" ON "public"."line_broadcast_deliveries" USING "btree" ("broadcast_log_id", "status") WHERE (("status" = 'failed'::"text") AND ("retry_count" < 3));



CREATE INDEX "idx_line_broadcast_deliveries_status" ON "public"."line_broadcast_deliveries" USING "btree" ("status");



CREATE INDEX "idx_line_broadcast_logs_created_at" ON "public"."line_broadcast_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_line_broadcast_logs_scheduled" ON "public"."line_broadcast_logs" USING "btree" ("scheduled_at") WHERE ("status" = 'scheduled'::"text");



CREATE INDEX "idx_line_broadcast_logs_status" ON "public"."line_broadcast_logs" USING "btree" ("status");



CREATE INDEX "idx_notification_reads_notification_id" ON "public"."notification_reads" USING "btree" ("notification_id");



CREATE INDEX "idx_notification_reads_user_id" ON "public"."notification_reads" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_target_company_id" ON "public"."notifications" USING "btree" ("target_company_id");



CREATE INDEX "idx_phone_call_list_items_candidate_id" ON "public"."phone_call_list_items" USING "btree" ("candidate_id");



CREATE INDEX "idx_phone_call_list_items_list_id" ON "public"."phone_call_list_items" USING "btree" ("list_id");



CREATE INDEX "idx_phone_call_list_items_status" ON "public"."phone_call_list_items" USING "btree" ("status");



CREATE INDEX "idx_phone_call_lists_created_at" ON "public"."phone_call_lists" USING "btree" ("created_at");



CREATE INDEX "idx_phone_call_lists_created_by" ON "public"."phone_call_lists" USING "btree" ("created_by");



CREATE INDEX "idx_phone_calls_call_date" ON "public"."phone_calls" USING "btree" ("call_date");



CREATE INDEX "idx_phone_calls_caller_id" ON "public"."phone_calls" USING "btree" ("caller_id");



CREATE INDEX "idx_phone_calls_candidate_id" ON "public"."phone_calls" USING "btree" ("candidate_id");



CREATE INDEX "idx_phone_calls_created_by" ON "public"."phone_calls" USING "btree" ("created_by");



CREATE INDEX "idx_profiles_deleted_at" ON "public"."profiles" USING "btree" ("deleted_at");



CREATE INDEX "idx_school_master_dept_hira" ON "public"."school_master" USING "gin" ("department_name_hira" "public"."gin_trgm_ops");



CREATE INDEX "idx_school_master_dept_name" ON "public"."school_master" USING "gin" ("department_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_school_master_faculty_hira" ON "public"."school_master" USING "gin" ("faculty_name_hira" "public"."gin_trgm_ops");



CREATE INDEX "idx_school_master_faculty_name" ON "public"."school_master" USING "gin" ("faculty_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_school_master_kcode" ON "public"."school_master" USING "btree" ("school_kcode");



CREATE INDEX "idx_school_master_school_hira" ON "public"."school_master" USING "gin" ("school_name_hira" "public"."gin_trgm_ops");



CREATE INDEX "idx_school_master_school_name" ON "public"."school_master" USING "gin" ("school_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_session_dates_draft_event_date" ON "public"."session_dates_draft" USING "btree" ("event_date");



CREATE INDEX "idx_session_dates_draft_session_draft_id" ON "public"."session_dates_draft" USING "btree" ("session_draft_id");



CREATE INDEX "idx_session_dates_event_date" ON "public"."session_dates" USING "btree" ("event_date");



CREATE INDEX "idx_session_dates_session_id" ON "public"."session_dates" USING "btree" ("session_id");



CREATE INDEX "idx_session_reservations_candidate_id" ON "public"."session_reservations" USING "btree" ("candidate_id");



CREATE INDEX "idx_session_reservations_session_date_id" ON "public"."session_reservations" USING "btree" ("session_date_id");



CREATE INDEX "idx_session_reservations_status" ON "public"."session_reservations" USING "btree" ("status");



CREATE INDEX "idx_sessions_company_id" ON "public"."sessions" USING "btree" ("company_id");



CREATE INDEX "idx_sessions_display_order" ON "public"."sessions" USING "btree" ("display_order");



CREATE INDEX "idx_sessions_draft_company_id" ON "public"."sessions_draft" USING "btree" ("company_id");



CREATE INDEX "idx_sessions_draft_display_order" ON "public"."sessions_draft" USING "btree" ("display_order");



CREATE INDEX "idx_sessions_draft_graduation_year" ON "public"."sessions_draft" USING "btree" ("graduation_year");



CREATE INDEX "idx_sessions_draft_production_session_id" ON "public"."sessions_draft" USING "btree" ("production_session_id");



CREATE INDEX "idx_sessions_draft_status" ON "public"."sessions_draft" USING "btree" ("draft_status");



CREATE INDEX "idx_sessions_graduation_year" ON "public"."sessions" USING "btree" ("graduation_year");



CREATE INDEX "idx_sessions_status" ON "public"."sessions" USING "btree" ("status");



CREATE INDEX "idx_storage_cleanup_schedules_status" ON "public"."storage_cleanup_schedules" USING "btree" ("status");



CREATE INDEX "idx_storage_deletion_queue_created_at" ON "public"."storage_deletion_queue" USING "btree" ("created_at");



CREATE INDEX "idx_storage_deletion_queue_status" ON "public"."storage_deletion_queue" USING "btree" ("status");



CREATE INDEX "idx_top_page_featured_videos_kind_display_order" ON "public"."top_page_featured_videos" USING "btree" ("kind", "display_order");



CREATE INDEX "idx_videos_category" ON "public"."videos" USING "btree" ("category");



CREATE INDEX "idx_videos_company_id" ON "public"."videos" USING "btree" ("company_id");



CREATE INDEX "idx_videos_display_order" ON "public"."videos" USING "btree" ("display_order");



CREATE INDEX "idx_videos_draft_category" ON "public"."videos_draft" USING "btree" ("category");



CREATE INDEX "idx_videos_draft_company_id" ON "public"."videos_draft" USING "btree" ("company_id");



CREATE INDEX "idx_videos_draft_conversion_status" ON "public"."videos_draft" USING "btree" ("conversion_status");



CREATE INDEX "idx_videos_draft_display_order" ON "public"."videos_draft" USING "btree" ("display_order");



CREATE INDEX "idx_videos_draft_mediaconvert_job_id" ON "public"."videos_draft" USING "btree" ("mediaconvert_job_id");



CREATE INDEX "idx_videos_draft_production_video_id" ON "public"."videos_draft" USING "btree" ("production_video_id");



CREATE INDEX "idx_videos_draft_status" ON "public"."videos_draft" USING "btree" ("draft_status");



CREATE INDEX "idx_videos_status" ON "public"."videos" USING "btree" ("status");



CREATE INDEX "master_areas_is_active_idx" ON "public"."event_areas" USING "btree" ("is_active");



CREATE INDEX "master_event_types_area_idx" ON "public"."event_types" USING "btree" ("area");



CREATE INDEX "master_event_types_is_active_idx" ON "public"."event_types" USING "btree" ("is_active");



CREATE INDEX "master_event_types_target_graduation_year_idx" ON "public"."event_types" USING "btree" ("target_graduation_year");



CREATE INDEX "master_graduation_years_is_active_idx" ON "public"."event_graduation_years" USING "btree" ("is_active");



CREATE INDEX "matching_results_candidate_id_idx" ON "public"."matching_results" USING "btree" ("candidate_id");



CREATE INDEX "matching_results_company_id_idx" ON "public"."matching_results" USING "btree" ("company_id");



CREATE INDEX "matching_results_session_id_idx" ON "public"."matching_results" USING "btree" ("matching_session_id");



CREATE INDEX "matching_sessions_event_id_idx" ON "public"."event_matching_sessions" USING "btree" ("event_id");



CREATE INDEX "matching_sessions_status_idx" ON "public"."event_matching_sessions" USING "btree" ("status");



CREATE INDEX "profiles_company_id_idx" ON "public"."profiles" USING "btree" ("company_id");



CREATE INDEX "profiles_created_at_idx" ON "public"."profiles" USING "btree" ("created_at");



CREATE INDEX "profiles_updated_at_idx" ON "public"."profiles" USING "btree" ("updated_at");



CREATE INDEX "ratings_candidate_to_company_candidate_id_idx" ON "public"."event_ratings_candidate_to_company" USING "btree" ("candidate_id");



CREATE INDEX "ratings_candidate_to_company_company_id_idx" ON "public"."event_ratings_candidate_to_company" USING "btree" ("company_id");



CREATE INDEX "ratings_candidate_to_company_event_id_idx" ON "public"."event_ratings_candidate_to_company" USING "btree" ("event_id");



CREATE INDEX "ratings_recruiter_to_candidate_candidate_id_idx" ON "public"."event_ratings_recruiter_to_candidate" USING "btree" ("candidate_id");



CREATE INDEX "ratings_recruiter_to_candidate_company_id_idx" ON "public"."event_ratings_recruiter_to_candidate" USING "btree" ("company_id");



CREATE INDEX "ratings_recruiter_to_candidate_event_id_idx" ON "public"."event_ratings_recruiter_to_candidate" USING "btree" ("event_id");



CREATE UNIQUE INDEX "unique_companies_draft_production_company_id" ON "public"."companies_draft" USING "btree" ("production_company_id") WHERE ("production_company_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_company_pages_draft_production_page_id" ON "public"."company_pages_draft" USING "btree" ("production_page_id") WHERE ("production_page_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_job_postings_draft_production_job_id" ON "public"."job_postings_draft" USING "btree" ("production_job_id") WHERE ("production_job_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_sessions_draft_production_session_id" ON "public"."sessions_draft" USING "btree" ("production_session_id") WHERE ("production_session_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "set_candidate_management_updated_at" BEFORE UPDATE ON "public"."candidate_management" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_email_templates_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_application_progress_updated_at" BEFORE UPDATE ON "public"."application_progress" FOR EACH ROW EXECUTE FUNCTION "public"."update_application_progress_updated_at"();



CREATE OR REPLACE TRIGGER "update_applications_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ca_interviews_updated_at" BEFORE UPDATE ON "public"."ca_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_ca_interviews_updated_at"();



CREATE OR REPLACE TRIGGER "update_candidates_updated_at" BEFORE UPDATE ON "public"."candidates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_comment_templates_updated_at" BEFORE UPDATE ON "public"."comment_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_companies_draft_updated_at" BEFORE UPDATE ON "public"."companies_draft" FOR EACH ROW EXECUTE FUNCTION "public"."update_companies_draft_updated_at"();



CREATE OR REPLACE TRIGGER "update_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_companies_updated_at" BEFORE UPDATE ON "public"."event_companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_matching_sessions_updated_at" BEFORE UPDATE ON "public"."event_matching_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_reservations_updated_at" BEFORE UPDATE ON "public"."event_reservations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_event_special_interviews_updated_at" BEFORE UPDATE ON "public"."event_special_interviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_postings_draft_updated_at" BEFORE UPDATE ON "public"."job_postings_draft" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_postings_draft_updated_at"();



CREATE OR REPLACE TRIGGER "update_job_postings_updated_at" BEFORE UPDATE ON "public"."job_postings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_master_areas_updated_at" BEFORE UPDATE ON "public"."event_areas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_master_event_types_updated_at" BEFORE UPDATE ON "public"."event_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_master_graduation_years_updated_at" BEFORE UPDATE ON "public"."event_graduation_years" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_phone_call_list_items_updated_at" BEFORE UPDATE ON "public"."phone_call_list_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_phone_call_list_items_updated_at"();



CREATE OR REPLACE TRIGGER "update_phone_call_lists_updated_at" BEFORE UPDATE ON "public"."phone_call_lists" FOR EACH ROW EXECUTE FUNCTION "public"."update_phone_call_lists_updated_at"();



CREATE OR REPLACE TRIGGER "update_phone_calls_updated_at" BEFORE UPDATE ON "public"."phone_calls" FOR EACH ROW EXECUTE FUNCTION "public"."update_phone_calls_updated_at"();



CREATE OR REPLACE TRIGGER "update_ratings_candidate_to_company_updated_at" BEFORE UPDATE ON "public"."event_ratings_candidate_to_company" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ratings_recruiter_to_candidate_updated_at" BEFORE UPDATE ON "public"."event_ratings_recruiter_to_candidate" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_dates_draft_updated_at" BEFORE UPDATE ON "public"."session_dates_draft" FOR EACH ROW EXECUTE FUNCTION "public"."update_session_dates_draft_updated_at"();



CREATE OR REPLACE TRIGGER "update_session_dates_updated_at" BEFORE UPDATE ON "public"."session_dates" FOR EACH ROW EXECUTE FUNCTION "public"."update_session_dates_updated_at"();



CREATE OR REPLACE TRIGGER "update_sessions_draft_updated_at" BEFORE UPDATE ON "public"."sessions_draft" FOR EACH ROW EXECUTE FUNCTION "public"."update_sessions_draft_updated_at"();



CREATE OR REPLACE TRIGGER "update_sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_sessions_updated_at"();



ALTER TABLE ONLY "public"."admin_line_user_ids"
    ADD CONSTRAINT "admin_line_user_ids_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."application_progress"
    ADD CONSTRAINT "application_progress_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."application_progress"
    ADD CONSTRAINT "application_progress_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."application_progress"
    ADD CONSTRAINT "application_progress_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "ca_interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "ca_interviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "ca_interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ca_interviews"
    ADD CONSTRAINT "ca_interviews_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."candidate_management"
    ADD CONSTRAINT "candidate_management_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."candidate_management"
    ADD CONSTRAINT "candidate_management_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comment_templates"
    ADD CONSTRAINT "comment_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies_draft"
    ADD CONSTRAINT "companies_draft_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies_draft"
    ADD CONSTRAINT "companies_draft_production_company_id_fkey" FOREIGN KEY ("production_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_pages"
    ADD CONSTRAINT "company_pages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_pages_draft"
    ADD CONSTRAINT "company_pages_draft_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_pages_draft"
    ADD CONSTRAINT "company_pages_draft_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_pages_draft"
    ADD CONSTRAINT "company_pages_draft_production_page_id_fkey" FOREIGN KEY ("production_page_id") REFERENCES "public"."company_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_companies"
    ADD CONSTRAINT "event_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_companies"
    ADD CONSTRAINT "event_companies_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_reservations"
    ADD CONSTRAINT "event_reservations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_reservations"
    ADD CONSTRAINT "event_reservations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_special_interviews"
    ADD CONSTRAINT "event_special_interviews_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_special_interviews"
    ADD CONSTRAINT "event_special_interviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_special_interviews"
    ADD CONSTRAINT "event_special_interviews_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_types"
    ADD CONSTRAINT "event_types_area_fkey" FOREIGN KEY ("area") REFERENCES "public"."event_areas"("name") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_types"
    ADD CONSTRAINT "event_types_target_graduation_year_fkey" FOREIGN KEY ("target_graduation_year") REFERENCES "public"."event_graduation_years"("year") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "public"."event_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."line_broadcast_logs"
    ADD CONSTRAINT "fk_line_broadcast_logs_template" FOREIGN KEY ("template_id") REFERENCES "public"."line_message_templates"("id");



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_postings"
    ADD CONSTRAINT "job_postings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."job_postings_draft"
    ADD CONSTRAINT "job_postings_draft_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_postings_draft"
    ADD CONSTRAINT "job_postings_draft_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_postings_draft"
    ADD CONSTRAINT "job_postings_draft_production_job_id_fkey" FOREIGN KEY ("production_job_id") REFERENCES "public"."job_postings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."line_broadcast_deliveries"
    ADD CONSTRAINT "line_broadcast_deliveries_broadcast_log_id_fkey" FOREIGN KEY ("broadcast_log_id") REFERENCES "public"."line_broadcast_logs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."line_broadcast_logs"
    ADD CONSTRAINT "line_broadcast_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."line_message_templates"
    ADD CONSTRAINT "line_message_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."matching_results"
    ADD CONSTRAINT "matching_results_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matching_results"
    ADD CONSTRAINT "matching_results_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matching_results"
    ADD CONSTRAINT "matching_results_matching_session_id_fkey" FOREIGN KEY ("matching_session_id") REFERENCES "public"."event_matching_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_matching_sessions"
    ADD CONSTRAINT "matching_sessions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_target_company_id_fkey" FOREIGN KEY ("target_company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_call_list_items"
    ADD CONSTRAINT "phone_call_list_items_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_call_list_items"
    ADD CONSTRAINT "phone_call_list_items_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."phone_call_lists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_call_lists"
    ADD CONSTRAINT "phone_call_lists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."phone_call_lists"
    ADD CONSTRAINT "phone_call_lists_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."phone_calls"
    ADD CONSTRAINT "phone_calls_caller_id_fkey" FOREIGN KEY ("caller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."phone_calls"
    ADD CONSTRAINT "phone_calls_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phone_calls"
    ADD CONSTRAINT "phone_calls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."phone_calls"
    ADD CONSTRAINT "phone_calls_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_ratings_candidate_to_company"
    ADD CONSTRAINT "ratings_candidate_to_company_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_ratings_candidate_to_company"
    ADD CONSTRAINT "ratings_candidate_to_company_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_ratings_candidate_to_company"
    ADD CONSTRAINT "ratings_candidate_to_company_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_ratings_recruiter_to_candidate"
    ADD CONSTRAINT "ratings_recruiter_to_candidate_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_ratings_recruiter_to_candidate"
    ADD CONSTRAINT "ratings_recruiter_to_candidate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_ratings_recruiter_to_candidate"
    ADD CONSTRAINT "ratings_recruiter_to_candidate_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_ratings_recruiter_to_candidate"
    ADD CONSTRAINT "ratings_recruiter_to_candidate_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."session_dates_draft"
    ADD CONSTRAINT "session_dates_draft_session_draft_id_fkey" FOREIGN KEY ("session_draft_id") REFERENCES "public"."sessions_draft"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_dates"
    ADD CONSTRAINT "session_dates_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_reservations"
    ADD CONSTRAINT "session_reservations_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_reservations"
    ADD CONSTRAINT "session_reservations_session_date_id_fkey" FOREIGN KEY ("session_date_id") REFERENCES "public"."session_dates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions_draft"
    ADD CONSTRAINT "sessions_draft_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions_draft"
    ADD CONSTRAINT "sessions_draft_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions_draft"
    ADD CONSTRAINT "sessions_draft_production_session_id_fkey" FOREIGN KEY ("production_session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."top_page_featured_videos"
    ADD CONSTRAINT "top_page_featured_videos_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos_draft"
    ADD CONSTRAINT "videos_draft_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos_draft"
    ADD CONSTRAINT "videos_draft_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."videos_draft"
    ADD CONSTRAINT "videos_draft_production_video_id_fkey" FOREIGN KEY ("production_video_id") REFERENCES "public"."videos"("id") ON DELETE SET NULL;



CREATE POLICY "Admin and recruiters can delete candidates" ON "public"."candidates" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can delete companies" ON "public"."companies" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can insert candidates" ON "public"."candidates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can insert companies" ON "public"."companies" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage ca_interviews" ON "public"."ca_interviews" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage comment_templates" ON "public"."comment_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_areas" ON "public"."event_areas" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_companies" ON "public"."event_companies" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_graduation_years" ON "public"."event_graduation_years" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_matching_sessions" ON "public"."event_matching_sessions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_ratings_candidate_to_comp" ON "public"."event_ratings_candidate_to_company" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_ratings_recruiter_to_cand" ON "public"."event_ratings_recruiter_to_candidate" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_reservations" ON "public"."event_reservations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_special_interviews" ON "public"."event_special_interviews" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage event_types" ON "public"."event_types" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage events" ON "public"."events" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage matching_results" ON "public"."matching_results" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage phone_call_list_items" ON "public"."phone_call_list_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage phone_call_lists" ON "public"."phone_call_lists" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can manage phone_calls" ON "public"."phone_calls" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can update candidates" ON "public"."candidates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can update companies" ON "public"."companies" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view all application progress" ON "public"."application_progress" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view all applications" ON "public"."applications" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view all candidates" ON "public"."candidates" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view all companies" ON "public"."companies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view all job postings" ON "public"."job_postings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view ca_interviews" ON "public"."ca_interviews" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view comment_templates" ON "public"."comment_templates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view phone_call_list_items" ON "public"."phone_call_list_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view phone_call_lists" ON "public"."phone_call_lists" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin and recruiters can view phone_calls" ON "public"."phone_calls" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



CREATE POLICY "Admin can manage all session dates draft" ON "public"."session_dates_draft" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage ambassadors" ON "public"."top_page_ambassadors" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage banners" ON "public"."top_page_banners" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage documentaries" ON "public"."top_page_documentaries" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage hero items" ON "public"."top_page_hero_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage lp_company_logos" ON "public"."lp_company_logos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage lp_faq_items" ON "public"."lp_faq_items" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage lp_sample_videos" ON "public"."lp_sample_videos" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage lp_scroll_banner" ON "public"."lp_scroll_banner" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admin can manage shun diaries" ON "public"."top_page_shun_diaries" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can do all on top page featured videos" ON "public"."top_page_featured_videos" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can manage all notifications" ON "public"."notifications" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins can update all profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Anyone can view active videos" ON "public"."videos" FOR SELECT TO "authenticated", "anon" USING (("status" = 'active'::"public"."company_page_status"));



CREATE POLICY "Anyone can view top page featured videos" ON "public"."top_page_featured_videos" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Authenticated can view event_areas" ON "public"."event_areas" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_companies" ON "public"."event_companies" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_graduation_years" ON "public"."event_graduation_years" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_matching_sessions" ON "public"."event_matching_sessions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_ratings_candidate_to_company" ON "public"."event_ratings_candidate_to_company" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_ratings_recruiter_to_candidate" ON "public"."event_ratings_recruiter_to_candidate" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_reservations" ON "public"."event_reservations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_special_interviews" ON "public"."event_special_interviews" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view event_types" ON "public"."event_types" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view events" ON "public"."events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated can view matching_results" ON "public"."matching_results" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Candidates can cancel their own reservations" ON "public"."session_reservations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."candidate_id" = "session_reservations"."candidate_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."candidate_id" = "session_reservations"."candidate_id")))));



CREATE POLICY "Candidates can insert own row" ON "public"."candidates" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'candidate'::"public"."user_role")))));



CREATE POLICY "Candidates can insert their own applications" ON "public"."applications" FOR INSERT TO "authenticated" WITH CHECK (("candidate_id" = ( SELECT "profiles"."candidate_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'candidate'::"public"."user_role")))));



CREATE POLICY "Candidates can update own row" ON "public"."candidates" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."candidate_id" = "candidates"."id")))));



CREATE POLICY "Candidates can view own row" ON "public"."candidates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."candidate_id" = "candidates"."id")))));



CREATE POLICY "Candidates can view their own application progress" ON "public"."application_progress" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."applications"
  WHERE (("applications"."id" = "application_progress"."application_id") AND ("applications"."candidate_id" = "auth"."uid"())))));



CREATE POLICY "Candidates can view their own applications" ON "public"."applications" FOR SELECT TO "authenticated" USING (("candidate_id" = ( SELECT "profiles"."candidate_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Candidates can view their own reservations" ON "public"."session_reservations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."candidate_id" = "session_reservations"."candidate_id")))));



CREATE POLICY "Company users can delete their company drafts" ON "public"."companies_draft" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "companies_draft"."company_id")))));



CREATE POLICY "Company users can delete their company job drafts" ON "public"."job_postings_draft" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings_draft"."company_id")))));



CREATE POLICY "Company users can delete their company job postings" ON "public"."job_postings" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings"."company_id")))));



CREATE POLICY "Company users can delete their company session dates" ON "public"."session_dates" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions" ON (("sessions"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions"."id" = "session_dates"."session_id")))));



CREATE POLICY "Company users can delete their company session dates draft" ON "public"."session_dates_draft" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions_draft" ON (("sessions_draft"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions_draft"."id" = "session_dates_draft"."session_draft_id")))));



CREATE POLICY "Company users can delete their company session drafts" ON "public"."sessions_draft" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions_draft"."company_id")))));



CREATE POLICY "Company users can delete their company sessions" ON "public"."sessions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions"."company_id")))));



CREATE POLICY "Company users can delete their company_pages_draft" ON "public"."company_pages_draft" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages_draft"."company_id")))));



CREATE POLICY "Company users can insert their company drafts" ON "public"."companies_draft" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "companies_draft"."company_id")))));



CREATE POLICY "Company users can insert their company job drafts" ON "public"."job_postings_draft" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings_draft"."company_id")))));



CREATE POLICY "Company users can insert their company job postings" ON "public"."job_postings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings"."company_id")))));



CREATE POLICY "Company users can insert their company pages" ON "public"."company_pages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages"."company_id")))));



CREATE POLICY "Company users can insert their company session dates" ON "public"."session_dates" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions" ON (("sessions"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions"."id" = "session_dates"."session_id")))));



CREATE POLICY "Company users can insert their company session dates draft" ON "public"."session_dates_draft" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions_draft" ON (("sessions_draft"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions_draft"."id" = "session_dates_draft"."session_draft_id")))));



CREATE POLICY "Company users can insert their company session drafts" ON "public"."sessions_draft" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions_draft"."company_id")))));



CREATE POLICY "Company users can insert their company session reservations" ON "public"."session_reservations" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."profiles"
     JOIN "public"."sessions" ON (("sessions"."company_id" = "profiles"."company_id")))
     JOIN "public"."session_dates" ON (("session_dates"."session_id" = "sessions"."id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("session_dates"."id" = "session_reservations"."session_date_id")))));



CREATE POLICY "Company users can insert their company sessions" ON "public"."sessions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions"."company_id")))));



CREATE POLICY "Company users can insert their company_pages_draft" ON "public"."company_pages_draft" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages_draft"."company_id")))));



CREATE POLICY "Company users can update their company drafts" ON "public"."companies_draft" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "companies_draft"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "companies_draft"."company_id")))));



CREATE POLICY "Company users can update their company job drafts" ON "public"."job_postings_draft" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings_draft"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings_draft"."company_id")))));



CREATE POLICY "Company users can update their company job postings" ON "public"."job_postings" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings"."company_id")))));



CREATE POLICY "Company users can update their company pages" ON "public"."company_pages" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages"."company_id")))));



CREATE POLICY "Company users can update their company session dates" ON "public"."session_dates" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions" ON (("sessions"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions"."id" = "session_dates"."session_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions" ON (("sessions"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions"."id" = "session_dates"."session_id")))));



CREATE POLICY "Company users can update their company session dates draft" ON "public"."session_dates_draft" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions_draft" ON (("sessions_draft"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions_draft"."id" = "session_dates_draft"."session_draft_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions_draft" ON (("sessions_draft"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions_draft"."id" = "session_dates_draft"."session_draft_id")))));



CREATE POLICY "Company users can update their company session drafts" ON "public"."sessions_draft" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions_draft"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions_draft"."company_id")))));



CREATE POLICY "Company users can update their company session reservations" ON "public"."session_reservations" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."profiles"
     JOIN "public"."sessions" ON (("sessions"."company_id" = "profiles"."company_id")))
     JOIN "public"."session_dates" ON (("session_dates"."session_id" = "sessions"."id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("session_dates"."id" = "session_reservations"."session_date_id")))));



CREATE POLICY "Company users can update their company sessions" ON "public"."sessions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions"."company_id")))));



CREATE POLICY "Company users can update their company_pages_draft" ON "public"."company_pages_draft" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages_draft"."company_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages_draft"."company_id")))));



CREATE POLICY "Company users can view their company drafts" ON "public"."companies_draft" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "companies_draft"."company_id")))));



CREATE POLICY "Company users can view their company job drafts" ON "public"."job_postings_draft" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings_draft"."company_id")))));



CREATE POLICY "Company users can view their company job postings" ON "public"."job_postings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "job_postings"."company_id")))));



CREATE POLICY "Company users can view their company pages" ON "public"."company_pages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages"."company_id")))));



CREATE POLICY "Company users can view their company session dates" ON "public"."session_dates" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions" ON (("sessions"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions"."id" = "session_dates"."session_id")))));



CREATE POLICY "Company users can view their company session dates draft" ON "public"."session_dates_draft" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."sessions_draft" ON (("sessions_draft"."company_id" = "profiles"."company_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("sessions_draft"."id" = "session_dates_draft"."session_draft_id")))));



CREATE POLICY "Company users can view their company session drafts" ON "public"."sessions_draft" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions_draft"."company_id")))));



CREATE POLICY "Company users can view their company session reservations" ON "public"."session_reservations" FOR SELECT TO "authenticated" USING ("public"."session_date_belongs_to_current_user_company"("session_date_id"));



CREATE POLICY "Company users can view their company sessions" ON "public"."sessions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "sessions"."company_id")))));



CREATE POLICY "Company users can view their company_pages_draft" ON "public"."company_pages_draft" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."company_id" = "company_pages_draft"."company_id")))));



CREATE POLICY "Company users can view their notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("target_company_id" IS NULL) OR ("target_company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Public can view active job postings" ON "public"."job_postings" FOR SELECT TO "authenticated", "anon" USING (("status" = 'active'::"public"."job_status"));



CREATE POLICY "Public can view active session dates" ON "public"."session_dates" FOR SELECT TO "authenticated", "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."sessions"
  WHERE (("sessions"."id" = "session_dates"."session_id") AND ("sessions"."status" = 'active'::"public"."session_status")))));



COMMENT ON POLICY "Public can view active session dates" ON "public"."session_dates" IS '公開中の説明会の日程は誰でも閲覧可能';



CREATE POLICY "Public can view active sessions" ON "public"."sessions" FOR SELECT TO "authenticated", "anon" USING (("status" = 'active'::"public"."session_status"));



CREATE POLICY "Public can view ambassadors" ON "public"."top_page_ambassadors" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view banners" ON "public"."top_page_banners" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view companies" ON "public"."companies" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view company pages" ON "public"."company_pages" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view documentaries" ON "public"."top_page_documentaries" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view hero items" ON "public"."top_page_hero_items" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view lp_company_logos" ON "public"."lp_company_logos" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view lp_faq_items" ON "public"."lp_faq_items" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view lp_sample_videos" ON "public"."lp_sample_videos" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view lp_scroll_banner" ON "public"."lp_scroll_banner" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public can view shun diaries" ON "public"."top_page_shun_diaries" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Public read school_master" ON "public"."school_master" FOR SELECT USING (true);



CREATE POLICY "Users can delete drafts from their company" ON "public"."videos_draft" FOR DELETE USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own reads" ON "public"."notification_reads" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert drafts for their company" ON "public"."videos_draft" FOR INSERT WITH CHECK (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own reads" ON "public"."notification_reads" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update drafts from their company" ON "public"."videos_draft" FOR UPDATE USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update videos from their company" ON "public"."videos" FOR UPDATE USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view drafts from their company" ON "public"."videos_draft" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own reads" ON "public"."notification_reads" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view videos from their company" ON "public"."videos" FOR SELECT USING (("company_id" IN ( SELECT "profiles"."company_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "admin_all_admin_line_user_ids" ON "public"."admin_line_user_ids" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_line_broadcast_logs" ON "public"."line_broadcast_logs" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "admin_all_line_message_templates" ON "public"."line_message_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



ALTER TABLE "public"."admin_line_user_ids" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_select_line_broadcast_deliveries" ON "public"."line_broadcast_deliveries" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



ALTER TABLE "public"."application_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ca_interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidate_management" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."candidates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "candidates_read_own" ON "public"."candidate_management" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."candidate_id" = "candidate_management"."candidate_id")))));



ALTER TABLE "public"."comment_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies_draft" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_pages_draft" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_logs_admin_select" ON "public"."email_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_templates_admin_all" ON "public"."email_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



ALTER TABLE "public"."event_areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_graduation_years" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_matching_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_ratings_candidate_to_company" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_ratings_recruiter_to_candidate" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_special_interviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_postings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."job_postings_draft" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_broadcast_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_broadcast_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."line_message_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lp_company_logos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lp_faq_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lp_sample_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lp_scroll_banner" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matching_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_call_list_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_call_lists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phone_calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recruiters_full_access" ON "public"."candidate_management" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'recruiter'::"public"."user_role"]))))));



ALTER TABLE "public"."school_master" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_dates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_dates_draft" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions_draft" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_cleanup_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."storage_deletion_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."top_page_ambassadors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."top_page_banners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."top_page_documentaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."top_page_featured_videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."top_page_hero_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."top_page_shun_diaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos_draft" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_candidate_attended_event"("p_event_id" "uuid", "p_candidate_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_candidate_attended_event"("p_event_id" "uuid", "p_candidate_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_candidate_attended_event"("p_event_id" "uuid", "p_candidate_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_candidate_in_company_event"("p_candidate_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_candidate_in_company_event"("p_candidate_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_candidate_in_company_event"("p_candidate_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_company_in_event"("p_event_id" "uuid", "p_company_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_company_in_event"("p_event_id" "uuid", "p_company_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_company_in_event"("p_event_id" "uuid", "p_company_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_candidate_and_link_profile"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_candidate_and_link_profile"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_candidate_and_link_profile"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_reservation_count_for_dates"("p_session_date_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_reservation_count_for_dates"("p_session_date_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_reservation_count_for_dates"("p_session_date_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_company_session_reservations"("p_session_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_company_session_reservations"("p_session_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_company_session_reservations"("p_session_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_public_session_date_reservation_counts"("session_date_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_public_session_date_reservation_counts"("session_date_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_public_session_date_reservation_counts"("session_date_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."session_date_belongs_to_current_user_company"("p_session_date_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."session_date_belongs_to_current_user_company"("p_session_date_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."session_date_belongs_to_current_user_company"("p_session_date_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_application_progress_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_application_progress_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_application_progress_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ca_interviews_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ca_interviews_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ca_interviews_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_companies_draft_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_companies_draft_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_companies_draft_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_postings_draft_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_postings_draft_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_postings_draft_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_phone_call_list_items_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_phone_call_list_items_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_phone_call_list_items_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_phone_call_lists_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_phone_call_lists_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_phone_call_lists_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_phone_calls_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_phone_calls_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_phone_calls_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_dates_draft_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_dates_draft_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_dates_draft_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_dates_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_dates_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_dates_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_session_reservations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_session_reservations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_session_reservations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sessions_draft_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sessions_draft_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sessions_draft_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sessions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sessions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sessions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_line_user_ids" TO "anon";
GRANT ALL ON TABLE "public"."admin_line_user_ids" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_line_user_ids" TO "service_role";



GRANT ALL ON TABLE "public"."application_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."application_progress" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."ca_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."ca_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_management" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_management" TO "service_role";



GRANT ALL ON TABLE "public"."candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."candidates" TO "service_role";



GRANT ALL ON TABLE "public"."comment_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."comment_templates" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."companies_draft" TO "authenticated";
GRANT ALL ON TABLE "public"."companies_draft" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."company_pages" TO "anon";
GRANT ALL ON TABLE "public"."company_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."company_pages" TO "service_role";



GRANT ALL ON TABLE "public"."company_pages_draft" TO "authenticated";
GRANT ALL ON TABLE "public"."company_pages_draft" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."event_areas" TO "authenticated";
GRANT ALL ON TABLE "public"."event_areas" TO "service_role";



GRANT ALL ON TABLE "public"."event_companies" TO "authenticated";
GRANT ALL ON TABLE "public"."event_companies" TO "service_role";



GRANT ALL ON TABLE "public"."event_graduation_years" TO "authenticated";
GRANT ALL ON TABLE "public"."event_graduation_years" TO "service_role";



GRANT ALL ON TABLE "public"."event_matching_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."event_matching_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."event_ratings_candidate_to_company" TO "authenticated";
GRANT ALL ON TABLE "public"."event_ratings_candidate_to_company" TO "service_role";



GRANT ALL ON TABLE "public"."event_ratings_recruiter_to_candidate" TO "authenticated";
GRANT ALL ON TABLE "public"."event_ratings_recruiter_to_candidate" TO "service_role";



GRANT ALL ON TABLE "public"."event_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."event_special_interviews" TO "authenticated";
GRANT ALL ON TABLE "public"."event_special_interviews" TO "service_role";



GRANT ALL ON TABLE "public"."event_types" TO "authenticated";
GRANT ALL ON TABLE "public"."event_types" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."job_postings" TO "anon";
GRANT ALL ON TABLE "public"."job_postings" TO "authenticated";
GRANT ALL ON TABLE "public"."job_postings" TO "service_role";



GRANT ALL ON TABLE "public"."job_postings_draft" TO "authenticated";
GRANT ALL ON TABLE "public"."job_postings_draft" TO "service_role";



GRANT ALL ON TABLE "public"."line_broadcast_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."line_broadcast_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."line_broadcast_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."line_broadcast_logs" TO "anon";
GRANT ALL ON TABLE "public"."line_broadcast_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."line_broadcast_logs" TO "service_role";



GRANT ALL ON TABLE "public"."line_message_templates" TO "anon";
GRANT ALL ON TABLE "public"."line_message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."line_message_templates" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lp_company_logos" TO "anon";
GRANT ALL ON TABLE "public"."lp_company_logos" TO "authenticated";
GRANT ALL ON TABLE "public"."lp_company_logos" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lp_faq_items" TO "anon";
GRANT ALL ON TABLE "public"."lp_faq_items" TO "authenticated";
GRANT ALL ON TABLE "public"."lp_faq_items" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lp_sample_videos" TO "anon";
GRANT ALL ON TABLE "public"."lp_sample_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."lp_sample_videos" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."lp_scroll_banner" TO "anon";
GRANT ALL ON TABLE "public"."lp_scroll_banner" TO "authenticated";
GRANT ALL ON TABLE "public"."lp_scroll_banner" TO "service_role";



GRANT ALL ON TABLE "public"."matching_results" TO "authenticated";
GRANT ALL ON TABLE "public"."matching_results" TO "service_role";



GRANT ALL ON TABLE "public"."notification_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_reads" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."phone_call_list_items" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_call_list_items" TO "service_role";



GRANT ALL ON TABLE "public"."phone_call_lists" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_call_lists" TO "service_role";



GRANT ALL ON TABLE "public"."phone_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."phone_calls" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."school_master" TO "anon";
GRANT ALL ON TABLE "public"."school_master" TO "authenticated";
GRANT ALL ON TABLE "public"."school_master" TO "service_role";



GRANT ALL ON SEQUENCE "public"."school_master_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."school_master_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."school_master_id_seq" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."session_dates" TO "anon";
GRANT ALL ON TABLE "public"."session_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."session_dates" TO "service_role";



GRANT ALL ON TABLE "public"."session_dates_draft" TO "authenticated";
GRANT ALL ON TABLE "public"."session_dates_draft" TO "service_role";



GRANT ALL ON TABLE "public"."session_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."session_reservations" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."sessions_draft" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions_draft" TO "service_role";



GRANT ALL ON TABLE "public"."storage_cleanup_schedules" TO "anon";
GRANT ALL ON TABLE "public"."storage_cleanup_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_cleanup_schedules" TO "service_role";



GRANT ALL ON TABLE "public"."storage_deletion_queue" TO "anon";
GRANT ALL ON TABLE "public"."storage_deletion_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."storage_deletion_queue" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."top_page_ambassadors" TO "anon";
GRANT ALL ON TABLE "public"."top_page_ambassadors" TO "authenticated";
GRANT ALL ON TABLE "public"."top_page_ambassadors" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."top_page_banners" TO "anon";
GRANT ALL ON TABLE "public"."top_page_banners" TO "authenticated";
GRANT ALL ON TABLE "public"."top_page_banners" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."top_page_documentaries" TO "anon";
GRANT ALL ON TABLE "public"."top_page_documentaries" TO "authenticated";
GRANT ALL ON TABLE "public"."top_page_documentaries" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."top_page_featured_videos" TO "anon";
GRANT ALL ON TABLE "public"."top_page_featured_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."top_page_featured_videos" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."top_page_hero_items" TO "anon";
GRANT ALL ON TABLE "public"."top_page_hero_items" TO "authenticated";
GRANT ALL ON TABLE "public"."top_page_hero_items" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."top_page_shun_diaries" TO "anon";
GRANT ALL ON TABLE "public"."top_page_shun_diaries" TO "authenticated";
GRANT ALL ON TABLE "public"."top_page_shun_diaries" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



GRANT ALL ON TABLE "public"."videos_draft" TO "authenticated";
GRANT ALL ON TABLE "public"."videos_draft" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































