/**
 * 会員登録フォーム用の選択肢・バリデーション定数
 * 全項目必須。バリデーションとプルダウン・チェックボックスの値はここで一元管理する。
 */

/** 性別（文理区分は major_field に保存） */
export const GENDERS = [
  { value: "男性", label: "男性" },
  { value: "女性", label: "女性" },
  { value: "その他", label: "その他" }
] as const;

export type GenderValue = (typeof GENDERS)[number]["value"];

/** 学校種別（デフォルト: 大学） */
export const SCHOOL_TYPES = [
  { value: "大学", label: "大学" },
  { value: "大学院(修士)", label: "大学院(修士)" },
  { value: "大学院(博士)", label: "大学院(博士)" },
  { value: "短期大学", label: "短期大学" },
  { value: "専門学校", label: "専門学校" },
  { value: "高専", label: "高専" }
] as const;

export type SchoolTypeValue = (typeof SCHOOL_TYPES)[number]["value"];

/** 学校種別のデフォルト選択 */
export const SCHOOL_TYPE_DEFAULT: SchoolTypeValue = "大学";

/** 文理区分（major_field に保存。文系・理系・その他） */
export const MAJOR_CATEGORIES = [
  { value: "文系", label: "文系" },
  { value: "理系", label: "理系" },
  { value: "その他", label: "その他" }
] as const;

export type MajorCategoryValue = (typeof MAJOR_CATEGORIES)[number]["value"];

/** 4/1 時点の「その年」の年（年齢計算用） */
function getRefYearForAge(): number {
  return new Date().getFullYear();
}

/** 4/1 区切りで、その年の 18〜30 歳になる生年（新しい順） */
export function getBirthYears(): number[] {
  const refYear = getRefYearForAge();
  return Array.from({ length: 30 - 18 + 1 }, (_, i) => refYear - 18 - i);
}

/** その年の 20 歳の生年（生年月日デフォルト） */
export function getBirthYearDefault(): number {
  return getRefYearForAge() - 20;
}

/** 現在の年度（4/1 区切り）。例: 2025年3月 → 2024, 2025年4月 → 2025 */
function getAcademicYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4 ? year : year - 1;
}

/** その年度の 1〜4 年生の卒業年（4年卒→1年卒の順） */
export function getGraduationYears(): number[] {
  const ac = getAcademicYear();
  return [ac + 1, ac + 2, ac + 3, ac + 4];
}

/** 大学 3 年生の卒業年度（卒業年デフォルト） */
export function getGraduationYearDefault(): number {
  return getAcademicYear() + 2;
}

/** 卒業年のプルダウン表示ラベル（例: 「2027年卒（大学3年生）」） */
export function getGraduationYearLabel(year: number): string {
  const grade = 5 - (year - getAcademicYear());
  return grade >= 1 && grade <= 4
    ? `${year}年卒（大学${grade}年生）`
    : `${year}年卒`;
}

export const BIRTH_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 指定した年・月の日数（うるう年対応）。month は 1〜12 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 生年月日の「日」の選択肢。存在する日のみ（年・月に依存） */
export function getBirthDays(year: number, month: number): number[] {
  const days = getDaysInMonth(year, month);
  return Array.from({ length: days }, (_, i) => i + 1);
}

/** 興味のある業界（求職者用。複数選択 → text[] で保存） */
export const DESIRED_INDUSTRIES = [
  "IT・通信",
  "商社",
  "コンサルティング",
  "金融",
  "建設・不動産",
  "メーカー",
  "広告・マスコミ",
  "出版・印刷",
  "公務員",
  "その他"
] as const;

/** 興味のある職種（複数選択 → text[] で保存） */
export const DESIRED_JOB_TYPES = [
  "営業",
  "事務",
  "企画",
  "デザイナー",
  "専門職",
  "マーケティング",
  "開発・エンジニア",
  "人事",
  "経理・財務",
  "その他"
] as const;

/** メールアドレス用正規表現（英数字と . _ % + - @ のみ許可） */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+$/;

/** メールアドレスに含めてよい文字（入力制限・エラー表示用） */
export const EMAIL_ALLOWED_REGEX = /^[a-zA-Z0-9._%+\-@]*$/;

/** 電話番号（ハイフンなし）桁数 */
export const PHONE_LENGTH_MIN = 10;
export const PHONE_LENGTH_MAX = 11;
export const PHONE_REGEX = /^\d{10,11}$/;

/** パスワード: 英数字含む8文字以上 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*[0-9])[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{8,}$/;

/** カタカナのみ（氏名カナ用。全角カタカナ・ー・・） */
export const KANA_REGEX = /^[\u30A0-\u30FF]*$/;

/** 日付を YYYY-MM-DD 形式に整形（月・日はゼロパッド） */
export function formatDateOfBirth(year: number, month: number, day: number): string {
  const y = String(year);
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
