"use server";

import { createCompany, createCompanyWithRecruiter } from "@/lib/actions/company-account-actions";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { INDUSTRIES, EMPLOYEE_RANGES } from "@/constants/company-options";
import { PREFECTURES } from "@/constants/prefectures";
import { REPRESENTATIVE_NAME_MAX_LENGTH, COMPANY_INFO_MAX_LENGTH } from "@/constants/validation";
import { validateEmail, validateUrlWithProtocol, validateKatakana } from "@jobtv-app/shared/utils/validation";
import { revalidatePath } from "next/cache";

const CSV_MAX_ROWS = 200;
const INDUSTRY_VALUES: Set<string> = new Set(INDUSTRIES.map((i) => i.value).filter(Boolean));
const EMPLOYEE_VALUES: Set<string> = new Set(EMPLOYEE_RANGES.map((e) => e.value).filter(Boolean));
const PREFECTURE_SET = new Set(PREFECTURES);

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

function parseEstablishedDate(dateString: string): { year: string; month: string } | null {
  if (!dateString || !dateString.trim()) return null;
  const s = dateString.trim();
  const pattern1 = /^(\d{4})年(\d{1,2})月?$/;
  const match1 = s.match(pattern1);
  if (match1) return { year: match1[1], month: match1[2].padStart(2, "0") };
  const pattern2 = /^(\d{4})[-/.](\d{1,2})$/;
  const match2 = s.match(pattern2);
  if (match2) return { year: match2[1], month: match2[2].padStart(2, "0") };
  return null;
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

function validateCsvRow(row: string[], headerMap: Map<string, number>, rowIndex: number): string | null {
  const name = getCell(row, headerMap, "企業名");
  if (!name) return `${rowIndex}行目: 企業名は必須です`;
  const industry = getCell(row, headerMap, "業界");
  if (industry && !INDUSTRY_VALUES.has(industry)) return `${rowIndex}行目: 業界の値が不正です`;
  const prefecture = getCell(row, headerMap, "都道府県");
  if (prefecture && !PREFECTURE_SET.has(prefecture)) return `${rowIndex}行目: 都道府県の値が不正です`;
  const employees = getCell(row, headerMap, "従業員数");
  if (employees && !EMPLOYEE_VALUES.has(employees)) return `${rowIndex}行目: 従業員数の値が不正です`;
  const establishedStr = getCell(row, headerMap, "設立年月");
  if (establishedStr && !parseEstablishedDate(establishedStr)) return `${rowIndex}行目: 設立年月の形式が不正です`;
  const website = getCell(row, headerMap, "公式サイト");
  if (website) {
    const err = validateUrlWithProtocol(website, "公式サイト");
    if (err) return `${rowIndex}行目: ${err}`;
  }
  const representative = getCell(row, headerMap, "代表者名");
  if (representative && representative.length > REPRESENTATIVE_NAME_MAX_LENGTH)
    return `${rowIndex}行目: 代表者名は${REPRESENTATIVE_NAME_MAX_LENGTH}文字以内です`;
  const companyInfo = getCell(row, headerMap, "企業情報");
  if (companyInfo && companyInfo.length > COMPANY_INFO_MAX_LENGTH)
    return `${rowIndex}行目: 企業情報は${COMPANY_INFO_MAX_LENGTH}文字以内です`;
  const status = getCell(row, headerMap, "ステータス");
  if (status && status !== "active" && status !== "closed") return `${rowIndex}行目: ステータスは active または closed です`;
  const email = getCell(row, headerMap, "メールアドレス");
  const lastName = getCell(row, headerMap, "姓");
  const firstName = getCell(row, headerMap, "名");
  const lastNameKana = getCell(row, headerMap, "姓カナ");
  const firstNameKana = getCell(row, headerMap, "名カナ");
  const hasRecruiter = email !== "" && lastName !== "" && firstName !== "" && lastNameKana !== "" && firstNameKana !== "";
  const partialRecruiter = [email, lastName, firstName, lastNameKana, firstNameKana].filter((s) => s !== "").length > 0;
  if (partialRecruiter && !hasRecruiter)
    return `${rowIndex}行目: リクルーターを登録する場合はメールアドレス・姓・名・姓カナ・名カナをすべて入力してください`;
  if (hasRecruiter) {
    const emailErr = validateEmail(email);
    if (emailErr) return `${rowIndex}行目: ${emailErr}`;
    const lnErr = validateKatakana(lastNameKana, "姓（カナ）");
    if (lnErr) return `${rowIndex}行目: ${lnErr}`;
    const fnErr = validateKatakana(firstNameKana, "名（カナ）");
    if (fnErr) return `${rowIndex}行目: ${fnErr}`;
  }
  return null;
}

export async function createCompaniesFromCsv(formData: FormData): Promise<{
  data: { created: number; errors: { row: number; message: string }[] } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };
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
  if (!headerMap.has("企業名")) return { data: null, error: "CSVのヘッダーに「企業名」が含まれている必要があります" };
  const dataRows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    if (dataRows.length >= CSV_MAX_ROWS) break;
    const row = parseCSVLine(lines[i]);
    if (row.some((cell) => cell.trim() !== "")) dataRows.push(row);
  }
  if (dataRows.length > CSV_MAX_ROWS) return { data: null, error: `データ行は${CSV_MAX_ROWS}行までです` };
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
    const companyData = {
      name: getCell(row, headerMap, "企業名"),
      industry: getCell(row, headerMap, "業界") || null,
      prefecture: getCell(row, headerMap, "都道府県") || null,
      address_line1: getCell(row, headerMap, "市区町村・番地") || null,
      address_line2: getCell(row, headerMap, "ビル名・部屋番号") || null,
      website: getCell(row, headerMap, "公式サイト") || null,
      representative: getCell(row, headerMap, "代表者名") || null,
      established: (() => {
        const s = getCell(row, headerMap, "設立年月");
        if (!s) return null;
        const p = parseEstablishedDate(s);
        return p ? `${p.year}年${parseInt(p.month)}月` : null;
      })(),
      employees: getCell(row, headerMap, "従業員数") || null,
      company_info: getCell(row, headerMap, "企業情報") || null,
      status: (getCell(row, headerMap, "ステータス") === "closed" ? "closed" : "active") as "active" | "closed",
    };
    const email = getCell(row, headerMap, "メールアドレス");
    const hasRecruiter =
      email !== "" &&
      getCell(row, headerMap, "姓") !== "" &&
      getCell(row, headerMap, "名") !== "" &&
      getCell(row, headerMap, "姓カナ") !== "" &&
      getCell(row, headerMap, "名カナ") !== "";
    try {
      if (hasRecruiter) {
        const result = await createCompanyWithRecruiter(companyData, {
          email,
          last_name: getCell(row, headerMap, "姓"),
          first_name: getCell(row, headerMap, "名"),
          last_name_kana: getCell(row, headerMap, "姓カナ"),
          first_name_kana: getCell(row, headerMap, "名カナ"),
        });
        if (result.error) errors.push({ row: rowIndex, message: result.error });
        else created++;
      } else {
        const result = await createCompany(companyData);
        if (result.error) errors.push({ row: rowIndex, message: result.error });
        else created++;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "作成処理でエラーが発生しました";
      errors.push({ row: rowIndex, message });
    }
  }
  revalidatePath("/admin/company-accounts");
  return { data: { created, errors }, error: null };
}
