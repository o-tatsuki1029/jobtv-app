/** 会員登録で RPC に渡す payload の型 */
export interface SignUpCandidatePayload {
  user_id?: string | null;
  email: string;
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  gender: string;
  desired_work_location: string;
  date_of_birth: string;
  phone: string;
  school_type: string;
  school_name: string;
  school_kcode?: string | null;
  faculty_name: string;
  department_name: string;
  major_field: string;
  graduation_year: number;
  desired_industry: string[];
  desired_job_type: string[];
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}
