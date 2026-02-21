import { PREFECTURES } from "./prefectures";

/**
 * 業界の選択肢
 */
export const INDUSTRIES = [
  { value: "", label: "選択してください" },
  { value: "商社", label: "商社" },
  { value: "小売・流通", label: "小売・流通" },
  { value: "金融", label: "金融" },
  { value: "サービス・インフラ", label: "サービス・インフラ" },
  { value: "IT・ソフトウエア", label: "IT・ソフトウエア" },
  { value: "広告・出版・マスコミ", label: "広告・出版・マスコミ" },
  { value: "官公庁・公社・団体", label: "官公庁・公社・団体" },
  { value: "その他", label: "その他" }
] as const;

/**
 * 業界のオプションを生成（React Select用）
 */
export function generateIndustryOptions() {
  return INDUSTRIES;
}

/**
 * 設立年の選択肢を生成（現在年から1800年まで）
 */
export function generateYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 1800; i--) {
    years.push(i);
  }
  return years;
}

/**
 * 設立月の選択肢を生成（1-12月）
 */
export function generateMonthOptions(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

/**
 * 従業員数の範囲オプション
 */
export const EMPLOYEE_RANGES = [
  { value: "", label: "選択してください" },
  { value: "1-10人", label: "1-10人" },
  { value: "11-50人", label: "11-50人" },
  { value: "51-100人", label: "51-100人" },
  { value: "101-300人", label: "101-300人" },
  { value: "301-500人", label: "301-500人" },
  { value: "501-1000人", label: "501-1000人" },
  { value: "1001-5000人", label: "1001-5000人" },
  { value: "5001-10000人", label: "5001-10000人" },
  { value: "10001人以上", label: "10001人以上" }
] as const;

/**
 * 従業員数の範囲オプションを生成（React Select用）
 */
export function generateEmployeesRangeOptions() {
  return EMPLOYEE_RANGES;
}

/**
 * 都道府県の選択肢
 */
export const PREFECTURE_OPTIONS = [
  { value: "", label: "選択してください" },
  ...PREFECTURES.map((pref) => ({ value: pref, label: pref }))
] as const;

/**
 * 都道府県のオプションを生成（React Select用）
 */
export function generatePrefectureOptions() {
  return PREFECTURE_OPTIONS;
}
