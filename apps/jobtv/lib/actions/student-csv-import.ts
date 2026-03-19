"use server";

import { createStudent } from "@/lib/actions/student-account-actions";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { validateEmail, validateKatakana, validatePhone } from "@jobtv-app/shared/utils/validation";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { revalidatePath } from "next/cache";

const CSV_MAX_ROWS = 200;

const VALID_GENDERS = new Set(["男性", "女性", "その他"]);
const VALID_SCHOOL_TYPES = new Set(["大学", "大学院(修士)", "大学院(博士)", "短期大学", "専門学校", "高専"]);
const VALID_MAJOR_FIELDS = new Set(["文系", "理系", "その他"]);

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function getHeaderIndexMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => map.set(h.trim(), i));
  return map;
}

function getCell(row: string[], map: Map<string, number>, key: string): string {
  const i = map.get(key);
  return i !== undefined ? (row[i] ?? "").trim() : "";
}

/** セミコロン区切りの複数値を配列にパース */
function parseMultiValue(value: string): string[] {
  if (!value) return [];
  return value.split(/[;；]/).map((v) => v.trim()).filter(Boolean);
}

function validateCsvRow(row: string[], headerMap: Map<string, number>, rowIndex: number): string | null {
  // --- 必須 ---
  const email = getCell(row, headerMap, "メールアドレス");
  if (!email) return `${rowIndex}行目: メールアドレスは必須です`;
  const emailError = validateEmail(email);
  if (emailError) return `${rowIndex}行目: ${emailError}`;

  const lastName = getCell(row, headerMap, "姓");
  if (!lastName) return `${rowIndex}行目: 姓は必須です`;

  const firstName = getCell(row, headerMap, "名");
  if (!firstName) return `${rowIndex}行目: 名は必須です`;

  const lastNameKana = getCell(row, headerMap, "姓カナ");
  if (!lastNameKana) return `${rowIndex}行目: 姓カナは必須です`;
  const lastNameKanaError = validateKatakana(lastNameKana, "姓カナ");
  if (lastNameKanaError) return `${rowIndex}行目: ${lastNameKanaError}`;

  const firstNameKana = getCell(row, headerMap, "名カナ");
  if (!firstNameKana) return `${rowIndex}行目: 名カナは必須です`;
  const firstNameKanaError = validateKatakana(firstNameKana, "名カナ");
  if (firstNameKanaError) return `${rowIndex}行目: ${firstNameKanaError}`;

  // --- 任意（値があるときのみバリデーション） ---
  const gender = getCell(row, headerMap, "性別");
  if (gender && !VALID_GENDERS.has(gender)) {
    return `${rowIndex}行目: 性別は 男性/女性/その他 のいずれかです`;
  }

  const dob = getCell(row, headerMap, "生年月日");
  if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return `${rowIndex}行目: 生年月日は YYYY-MM-DD 形式で入力してください`;
  }

  const phone = getCell(row, headerMap, "電話番号");
  if (phone) {
    const phoneError = validatePhone(phone);
    if (phoneError) return `${rowIndex}行目: ${phoneError}`;
  }

  const schoolType = getCell(row, headerMap, "学校種別");
  if (schoolType && !VALID_SCHOOL_TYPES.has(schoolType)) {
    return `${rowIndex}行目: 学校種別の値が不正です`;
  }

  const majorField = getCell(row, headerMap, "文理区分");
  if (majorField && !VALID_MAJOR_FIELDS.has(majorField)) {
    return `${rowIndex}行目: 文理区分は 文系/理系/その他 のいずれかです`;
  }

  const graduationYear = getCell(row, headerMap, "卒業年度");
  if (graduationYear && isNaN(Number(graduationYear))) {
    return `${rowIndex}行目: 卒業年度は数値で入力してください`;
  }

  return null;
}

export async function createStudentsFromCsv(formData: FormData): Promise<{
  data: { created: number; errors: { row: number; message: string }[] } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const file = formData.get("file");
  if (!file || !(file instanceof File)) return { data: null, error: "CSVファイルを選択してください" };

  let text: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    text = buf.toString("utf-8").replace(/^\uFEFF/, "");
  } catch {
    return { data: null, error: "ファイルの読み込みに失敗しました（UTF-8で保存してください）" };
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return { data: null, error: "CSVにヘッダーとデータ行が含まれている必要があります" };

  const headers = parseCSVLine(lines[0]);
  const headerMap = getHeaderIndexMap(headers);

  // 必須ヘッダーチェック
  const requiredHeaders = ["メールアドレス", "姓", "名", "姓カナ", "名カナ"];
  for (const h of requiredHeaders) {
    if (!headerMap.has(h)) {
      return { data: null, error: `CSVのヘッダーに「${h}」が含まれている必要があります` };
    }
  }

  const dataRows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    if (dataRows.length >= CSV_MAX_ROWS) break;
    const row = parseCSVLine(lines[i]);
    if (row.some((cell) => cell.trim() !== "")) dataRows.push(row);
  }

  if (dataRows.length > CSV_MAX_ROWS) {
    return { data: null, error: `データ行は${CSV_MAX_ROWS}行までです` };
  }

  let created = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowIndex = i + 2;

    const validationError = validateCsvRow(row, headerMap, rowIndex);
    if (validationError) {
      errors.push({ row: rowIndex, message: validationError });
      continue;
    }

    const graduationYearStr = getCell(row, headerMap, "卒業年度");
    const desiredIndustry = parseMultiValue(getCell(row, headerMap, "興味のある業界"));
    const desiredJobType = parseMultiValue(getCell(row, headerMap, "興味のある職種"));

    const studentData = {
      email: getCell(row, headerMap, "メールアドレス"),
      last_name: getCell(row, headerMap, "姓"),
      first_name: getCell(row, headerMap, "名"),
      last_name_kana: getCell(row, headerMap, "姓カナ"),
      first_name_kana: getCell(row, headerMap, "名カナ"),
      gender: getCell(row, headerMap, "性別") || null,
      date_of_birth: getCell(row, headerMap, "生年月日") || null,
      phone: getCell(row, headerMap, "電話番号") || null,
      school_type: getCell(row, headerMap, "学校種別") || null,
      school_name: getCell(row, headerMap, "学校名") || null,
      faculty_name: getCell(row, headerMap, "学部名") || null,
      department_name: getCell(row, headerMap, "学科名") || null,
      major_field: getCell(row, headerMap, "文理区分") || null,
      graduation_year: graduationYearStr ? Number(graduationYearStr) : null,
      desired_work_location: (() => { const v = getCell(row, headerMap, "希望勤務地"); return v ? v.split(/[、,]/).map((s: string) => s.trim()).filter(Boolean) : null; })(),
      desired_industry: desiredIndustry.length > 0 ? desiredIndustry : null,
      desired_job_type: desiredJobType.length > 0 ? desiredJobType : null,
      referrer: getCell(row, headerMap, "流入元") || null,
      utm_source: getCell(row, headerMap, "utm_source") || null,
      utm_medium: getCell(row, headerMap, "utm_medium") || null,
      utm_campaign: getCell(row, headerMap, "utm_campaign") || null,
      utm_content: getCell(row, headerMap, "utm_content") || null,
      utm_term: getCell(row, headerMap, "utm_term") || null,
    };

    try {
      const result = await createStudent(studentData);
      if (result.error) {
        errors.push({ row: rowIndex, message: result.error });
      } else {
        created++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "作成処理でエラーが発生しました";
      errors.push({ row: rowIndex, message });
    }
  }

  if (user) {
    logAudit({
      userId: user.id,
      action: "student.csv_import",
      category: "account",
      resourceType: "candidates",
      app: "jobtv",
      metadata: { count: dataRows.length, successCount: created, errorCount: errors.length },
    });
  }

  revalidatePath("/admin/student-accounts");
  return { data: { created, errors }, error: null };
}
