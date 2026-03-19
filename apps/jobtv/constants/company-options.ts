import { PREFECTURES } from "./prefectures";

/**
 * 業界の選択肢
 */
export const INDUSTRIES = [
  { value: "", label: "選択してください" },
  { value: "IT・情報通信", label: "IT・情報通信" },
  { value: "人材・教育・その他", label: "人材・教育・その他" },
  { value: "広告・マスコミ", label: "広告・マスコミ" },
  { value: "流通・小売・チェーン", label: "流通・小売・チェーン" },
  { value: "建設・不動産", label: "建設・不動産" },
  { value: "メーカー（食品・医療・生活・他）", label: "メーカー（食品・医療・生活・他）" },
  { value: "メーカー（自動車・機械・電気・素材）", label: "メーカー（自動車・機械・電気・素材）" },
  { value: "コンサル・シンクタンク", label: "コンサル・シンクタンク" },
  { value: "金融・保険", label: "金融・保険" },
  { value: "エンタメ・レジャー・ブライダル", label: "エンタメ・レジャー・ブライダル" },
  { value: "公務員・団体職員", label: "公務員・団体職員" },
  { value: "運輸・物流", label: "運輸・物流" },
  { value: "エネルギー", label: "エネルギー" },
  { value: "サービス", label: "サービス" },
  { value: "商社（総合・専門）", label: "商社（総合・専門）" },
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
