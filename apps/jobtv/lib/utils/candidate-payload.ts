/**
 * FormData から RPC 用の candidate payload を組み立てる
 * "use server" ファイルから分離（non-async 関数は Server Action ファイルから export できないため）
 */

import type { SignUpCandidatePayload } from "@/lib/types/signup";

export function buildCandidatePayloadFromFormData(
  formData: FormData,
  email: string
): SignUpCandidatePayload {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  const getNum = (key: string) => {
    const v = formData.get(key);
    if (v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const getArray = (key: string) => {
    return formData.getAll(key).filter((x): x is string => typeof x === "string" && x !== "");
  };

  return {
    email,
    last_name: get("last_name"),
    first_name: get("first_name"),
    last_name_kana: get("last_name_kana"),
    first_name_kana: get("first_name_kana"),
    gender: get("gender"),
    desired_work_location: getArray("desired_work_location"),
    date_of_birth: get("date_of_birth") || null,
    phone: get("phone"),
    school_type: get("school_type"),
    school_name: get("school_name"),
    school_kcode: formData.get("school_kcode") ? String(formData.get("school_kcode")) : null,
    faculty_name: get("faculty_name") || null,
    department_name: get("department_name") || null,
    major_field: get("major_field"),
    graduation_year: getNum("graduation_year"),
    desired_industry: getArray("desired_industry"),
    desired_job_type: getArray("desired_job_type"),
    referrer: formData.get("referrer") ? String(formData.get("referrer")) : null,
    utm_source: formData.get("utm_source") ? String(formData.get("utm_source")) : null,
    utm_medium: formData.get("utm_medium") ? String(formData.get("utm_medium")) : null,
    utm_campaign: formData.get("utm_campaign") ? String(formData.get("utm_campaign")) : null,
    utm_content: formData.get("utm_content") ? String(formData.get("utm_content")) : null,
    utm_term: formData.get("utm_term") ? String(formData.get("utm_term")) : null,
    web_consultation: formData.get("web_consultation") === "true",
  };
}
