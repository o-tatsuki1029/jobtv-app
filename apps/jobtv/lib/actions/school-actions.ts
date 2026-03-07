"use server";

import { createClient } from "@/lib/supabase/server";

export interface SchoolSuggestItem {
  school_name: string;
  school_kcode: string;
  school_type: string;
  group_name: string | null;
}

// UI の school_type 値 → DB の school_type 値へのマッピング
const SCHOOL_TYPE_DB_MAP: Record<string, string> = {
  "大学院(修士)": "大学院",
  "大学院(博士)": "大学院",
  "専門学校": "専修学校",
  "高専": "高等専門学校",
};

function toDbSchoolType(uiValue: string): string {
  return SCHOOL_TYPE_DB_MAP[uiValue] ?? uiValue;
}

/**
 * 学校名サジェスト: 名前または読み仮名の先頭一致、DISTINCT、最大20件
 * schoolType を指定すると DB の school_type でフィルターする
 */
export async function searchSchoolNames(
  query: string,
  schoolType?: string
): Promise<{ data: SchoolSuggestItem[]; error: string | null }> {
  if (!query || query.trim().length === 0) return { data: [], error: null };

  const supabase = await createClient();
  const q = query.trim();

  let req = supabase
    .from("school_master")
    .select("school_name, school_kcode, school_type, group_name")
    .or(`school_name.ilike.${q}%,school_name_hira.ilike.${q}%`)
    .order("school_name")
    .limit(50);

  if (schoolType) {
    req = req.eq("school_type", toDbSchoolType(schoolType));
  }

  const { data, error } = await req;

  if (error) {
    console.error("searchSchoolNames error:", error);
    return { data: [], error: "学校名の取得に失敗しました" };
  }

  // DISTINCT on school_kcode (school_name + school_kcode が同じものをまとめる)
  const seen = new Set<string>();
  const unique: SchoolSuggestItem[] = [];
  for (const row of data ?? []) {
    const key = row.school_kcode;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push({
        school_name: row.school_name,
        school_kcode: row.school_kcode,
        school_type: row.school_type,
        group_name: row.group_name,
      });
    }
    if (unique.length >= 20) break;
  }

  return { data: unique, error: null };
}

/**
 * 学部サジェスト: kcode固定、名前または読み仮名の部分一致、DISTINCT
 */
export async function searchFacultyNames(
  schoolKcode: string,
  query: string
): Promise<{ data: { faculty_name: string }[]; error: string | null }> {
  if (!schoolKcode) return { data: [], error: null };

  const supabase = await createClient();

  let q = supabase
    .from("school_master")
    .select("faculty_name")
    .eq("school_kcode", schoolKcode)
    .not("faculty_name", "is", null)
    .order("faculty_name")
    .limit(50);

  if (query.trim()) {
    q = q.or(`faculty_name.ilike.${query.trim()}%,faculty_name_hira.ilike.${query.trim()}%`);
  }

  const { data, error } = await q;

  if (error) {
    console.error("searchFacultyNames error:", error);
    return { data: [], error: "学部名の取得に失敗しました" };
  }

  const seen = new Set<string>();
  const unique: { faculty_name: string }[] = [];
  for (const row of data ?? []) {
    if (row.faculty_name && !seen.has(row.faculty_name)) {
      seen.add(row.faculty_name);
      unique.push({ faculty_name: row.faculty_name });
    }
    if (unique.length >= 20) break;
  }

  return { data: unique, error: null };
}

/**
 * 学科サジェスト: kcode + 学部名固定、名前または読み仮名の部分一致、DISTINCT
 */
export async function searchDepartmentNames(
  schoolKcode: string,
  facultyName: string,
  query: string
): Promise<{ data: { department_name: string }[]; error: string | null }> {
  if (!schoolKcode || !facultyName) return { data: [], error: null };

  const supabase = await createClient();

  let q = supabase
    .from("school_master")
    .select("department_name")
    .eq("school_kcode", schoolKcode)
    .eq("faculty_name", facultyName)
    .not("department_name", "is", null)
    .order("department_name")
    .limit(50);

  if (query.trim()) {
    q = q.or(`department_name.ilike.${query.trim()}%,department_name_hira.ilike.${query.trim()}%`);
  }

  const { data, error } = await q;

  if (error) {
    console.error("searchDepartmentNames error:", error);
    return { data: [], error: "学科名の取得に失敗しました" };
  }

  const seen = new Set<string>();
  const unique: { department_name: string }[] = [];
  for (const row of data ?? []) {
    if (row.department_name && !seen.has(row.department_name)) {
      seen.add(row.department_name);
      unique.push({ department_name: row.department_name });
    }
    if (unique.length >= 20) break;
  }

  return { data: unique, error: null };
}
