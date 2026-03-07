"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { updateMyCandidateProfile, type UpdateCandidateProfileData } from "@/lib/actions/candidate-actions";
import { searchSchoolNames, searchFacultyNames, searchDepartmentNames } from "@/lib/actions/school-actions";
import SuggestInput, { type SuggestItem } from "@/components/common/SuggestInput";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { PREFECTURES } from "@/constants/prefectures";
import {
  GENDERS,
  SCHOOL_TYPES,
  SCHOOL_TYPE_DEFAULT,
  MAJOR_CATEGORIES,
  DESIRED_INDUSTRIES,
  DESIRED_JOB_TYPES,
  getGraduationYears,
  getGraduationYearDefault,
  getGraduationYearLabel,
  getBirthYears,
  getBirthYearDefault,
  BIRTH_MONTHS,
  getBirthDays,
  getDaysInMonth,
  formatDateOfBirth,
  PHONE_REGEX,
  PHONE_LENGTH_MIN,
  PHONE_LENGTH_MAX,
  KANA_REGEX
} from "@/constants/signup-options";

// ---- バリデーション関数（signup と共通ロジック） ----

function validatePhone(value: string): string | null {
  const v = value.replace(/\s/g, "");
  if (!v) return null;
  if (v.length < PHONE_LENGTH_MIN || v.length > PHONE_LENGTH_MAX) return "10桁または11桁の数字で入力してください";
  return PHONE_REGEX.test(v) ? null : "数字のみで入力してください（ハイフンなし）";
}

function validateKana(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return KANA_REGEX.test(v) ? null : "カタカナで入力してください";
}

// ---- 型 ----

interface CandidateProfileData {
  last_name: string;
  first_name: string;
  last_name_kana: string | null;
  first_name_kana: string | null;
  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;
  school_type: string | null;
  school_name: string | null;
  school_kcode: string | null;
  faculty_name: string | null;
  department_name: string | null;
  major_field: string | null;
  graduation_year: number | null;
  desired_work_location: string | null;
  desired_industry: string[] | null;
  desired_job_type: string[] | null;
  email: string | null;
}

interface ProfileEditFormProps {
  initialData: CandidateProfileData | null;
  error?: string;
}

// ---- コンポーネント ----

export default function ProfileEditForm({ initialData, error: loadError }: ProfileEditFormProps) {
  const { classes, theme } = useMainTheme();
  const isDark = theme === "dark";

  // 生年月日を年/月/日に分解
  const parseDob = (dob: string | null) => {
    if (!dob) return { year: getBirthYearDefault(), month: "" as const, day: "" as const };
    const [y, m, d] = dob.split("-").map(Number);
    return { year: y || getBirthYearDefault(), month: (m || "") as number | "", day: (d || "") as number | "" };
  };
  const initialDob = parseDob(initialData?.date_of_birth ?? null);

  const [form, setForm] = useState<Omit<UpdateCandidateProfileData, "date_of_birth">>({
    last_name: initialData?.last_name ?? "",
    first_name: initialData?.first_name ?? "",
    last_name_kana: initialData?.last_name_kana ?? "",
    first_name_kana: initialData?.first_name_kana ?? "",
    phone: initialData?.phone ?? "",
    gender: initialData?.gender ?? null,
    school_type: initialData?.school_type ?? SCHOOL_TYPE_DEFAULT,
    school_name: initialData?.school_name ?? "",
    school_kcode: initialData?.school_kcode ?? null,
    faculty_name: initialData?.faculty_name ?? "",
    department_name: initialData?.department_name ?? "",
    major_field: initialData?.major_field ?? null,
    graduation_year: initialData?.graduation_year ?? getGraduationYearDefault(),
    desired_work_location: initialData?.desired_work_location ?? "",
    desired_industry: initialData?.desired_industry ?? [],
    desired_job_type: initialData?.desired_job_type ?? []
  });

  const [birthYear, setBirthYear] = useState(initialDob.year);
  const [birthMonth, setBirthMonth] = useState<number | "">(initialDob.month);
  const [birthDay, setBirthDay] = useState<number | "">(initialDob.day);

  const maxDay = getDaysInMonth(birthYear, birthMonth || 1);
  useEffect(() => {
    if (birthMonth && birthDay && birthDay > maxDay) setBirthDay(maxDay);
  }, [birthYear, birthMonth, maxDay, birthDay]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  // ---- スタイル ----
  const inputBase = cn(
    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500",
    isDark
      ? "bg-gray-900 border-gray-700 text-white placeholder-gray-600"
      : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400"
  );
  const inputErrorStyle = isDark ? "border-red-500 bg-red-950/30" : "border-red-500 bg-red-50/50";
  const inputDisabledClass = cn(
    "w-full border rounded-lg px-3 py-2 text-sm cursor-not-allowed",
    isDark ? "bg-gray-800 border-gray-700 text-gray-500" : "bg-gray-100 border-gray-200 text-gray-400"
  );
  const labelClass = cn("block text-sm font-medium mb-1", isDark ? "text-gray-300" : "text-gray-700");
  const fieldErrorClass = cn("mt-0.5 text-xs", isDark ? "text-red-400" : "text-red-600");
  const sectionHeadingClass = cn("text-base font-semibold mb-3 pb-2 border-b", classes.textSecondary, classes.sectionBorder);
  const radioLabelClass = cn(
    "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors cursor-pointer",
    isDark
      ? "border-gray-700 bg-gray-900 text-gray-200 has-[:checked]:border-red-500 has-[:checked]:bg-red-950/40"
      : "border-gray-300 bg-gray-50 text-gray-900 has-[:checked]:border-red-500 has-[:checked]:bg-red-50"
  );

  // ---- ハンドラ ----
  const handleChange = (field: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMultiToggle = (field: "desired_industry" | "desired_job_type", value: string) => {
    setForm((prev) => {
      const current = prev[field] as string[];
      return {
        ...prev,
        [field]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      };
    });
  };

  const setFieldError = (field: string, msg: string | null) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg ?? "" }));
  };

  // submit 前の全フィールドバリデーション
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.last_name.trim()) errors.last_name = "姓を入力してください";
    if (!form.first_name.trim()) errors.first_name = "名を入力してください";
    if (!form.last_name_kana?.trim()) {
      errors.last_name_kana = "姓（カナ）を入力してください";
    } else {
      const e = validateKana(form.last_name_kana);
      if (e) errors.last_name_kana = e;
    }
    if (!form.first_name_kana?.trim()) {
      errors.first_name_kana = "名（カナ）を入力してください";
    } else {
      const e = validateKana(form.first_name_kana);
      if (e) errors.first_name_kana = e;
    }
    if (!form.gender) errors.gender = "性別を選択してください";
    if (form.phone) {
      const e = validatePhone(form.phone);
      if (e) errors.phone = e;
    }
    if (!form.desired_work_location) errors.desired_work_location = "希望勤務地を選択してください";
    if (!form.school_type) errors.school_type = "学校種別を選択してください";
    if (!form.school_name?.trim()) errors.school_name = "学校名を入力してください";
    if (!form.faculty_name?.trim()) errors.faculty_name = "学部名を入力してください";
    if (!form.department_name?.trim()) errors.department_name = "学科名を入力してください";
    if (!form.major_field) errors.major_field = "文理区分を選択してください";
    if (!form.graduation_year) errors.graduation_year = "卒業年度を選択してください";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // 最初のエラーへスクロール
      setTimeout(() => {
        const el = document.querySelector("[data-field-error]");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }
    setSaving(true);
    setMessage(null);
    const dateOfBirth = birthMonth && birthDay
      ? formatDateOfBirth(birthYear, birthMonth, Math.min(birthDay, getDaysInMonth(birthYear, birthMonth)))
      : null;
    const result = await updateMyCandidateProfile({ ...form, date_of_birth: dateOfBirth });
    setMessage(result.error
      ? { type: "error", text: result.error }
      : { type: "success", text: "プロフィールを保存しました" }
    );
    setSaving(false);
    setTimeout(() => {
      messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const graduationYears = getGraduationYears();
  const birthDays = getBirthDays(birthYear, birthMonth || 1);

  // ---- エラー・ローディング表示 ----
  if (loadError || !initialData) {
    return (
      <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/mypage" className={cn("transition-colors hover:opacity-80", classes.textMuted)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold">プロフィール編集</h1>
          </div>
          <p className="text-red-400 text-sm">{loadError ?? "プロフィールを取得できませんでした"}</p>
        </div>
      </div>
    );
  }

  // ---- フォーム ----
  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mypage" className={cn("transition-colors hover:opacity-80", classes.textMuted)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">プロフィール編集</h1>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* ── 基本情報 ── */}
          <section>
            <h2 className={sectionHeadingClass}>基本情報</h2>

            {/* 氏名 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>姓<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => { handleChange("last_name", e.target.value); setFieldError("last_name", null); }}
                  className={cn(inputBase, fieldErrors.last_name && inputErrorStyle)}
                  placeholder="山田"
                />
                {fieldErrors.last_name && <p className={fieldErrorClass} data-field-error>{fieldErrors.last_name}</p>}
              </div>
              <div>
                <label className={labelClass}>名<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => { handleChange("first_name", e.target.value); setFieldError("first_name", null); }}
                  className={cn(inputBase, fieldErrors.first_name && inputErrorStyle)}
                  placeholder="太郎"
                />
                {fieldErrors.first_name && <p className={fieldErrorClass} data-field-error>{fieldErrors.first_name}</p>}
              </div>
              <div>
                <label className={labelClass}>姓（カナ）<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={form.last_name_kana ?? ""}
                  onChange={(e) => { handleChange("last_name_kana", e.target.value); setFieldError("last_name_kana", validateKana(e.target.value)); }}
                  onBlur={(e) => setFieldError("last_name_kana", validateKana(e.target.value))}
                  className={cn(inputBase, fieldErrors.last_name_kana && inputErrorStyle)}
                  placeholder="ヤマダ"
                />
                {fieldErrors.last_name_kana && <p className={fieldErrorClass} data-field-error>{fieldErrors.last_name_kana}</p>}
              </div>
              <div>
                <label className={labelClass}>名（カナ）<span className="text-red-500 ml-0.5">*</span></label>
                <input
                  type="text"
                  value={form.first_name_kana ?? ""}
                  onChange={(e) => { handleChange("first_name_kana", e.target.value); setFieldError("first_name_kana", validateKana(e.target.value)); }}
                  onBlur={(e) => setFieldError("first_name_kana", validateKana(e.target.value))}
                  className={cn(inputBase, fieldErrors.first_name_kana && inputErrorStyle)}
                  placeholder="タロウ"
                />
                {fieldErrors.first_name_kana && <p className={fieldErrorClass} data-field-error>{fieldErrors.first_name_kana}</p>}
              </div>
            </div>

            {/* 性別 */}
            <div className="mt-4">
              <label className={labelClass}>性別<span className="text-red-500 ml-0.5">*</span></label>
              <div className="flex gap-2 pt-0.5">
                {GENDERS.map((g) => (
                  <label key={g.value} className="flex flex-1 min-w-0">
                    <span className={radioLabelClass}>
                      <input
                        type="radio"
                        name="gender"
                        value={g.value}
                        checked={form.gender === g.value}
                        onChange={() => { handleChange("gender", g.value); setFieldError("gender", null); }}
                        className="h-3.5 w-3.5 shrink-0 accent-red-500"
                      />
                      {g.label}
                    </span>
                  </label>
                ))}
              </div>
              {fieldErrors.gender && <p className={fieldErrorClass} data-field-error>{fieldErrors.gender}</p>}
            </div>

            {/* 電話番号 */}
            <div className="mt-4">
              <label className={labelClass}>電話番号（ハイフンなし）</label>
              <input
                type="tel"
                value={form.phone ?? ""}
                onChange={(e) => { handleChange("phone", e.target.value); setFieldError("phone", validatePhone(e.target.value)); }}
                onBlur={(e) => setFieldError("phone", validatePhone(e.target.value))}
                placeholder="09012345678"
                className={cn(inputBase, fieldErrors.phone && inputErrorStyle)}
              />
              {fieldErrors.phone && <p className={fieldErrorClass} data-field-error>{fieldErrors.phone}</p>}
            </div>

            {/* 生年月日 */}
            <div className="mt-4">
              <label className={labelClass}>生年月日<span className="text-red-500 ml-0.5">*</span></label>
              <div className="flex gap-2">
                <select value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} className={cn(inputBase, "flex-1")}>
                  {getBirthYears().map((y) => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={birthMonth} onChange={(e) => { setBirthMonth(e.target.value ? Number(e.target.value) : ""); setBirthDay(""); }} className={cn(inputBase, "flex-1")}>
                  <option value="">月</option>
                  {BIRTH_MONTHS.map((m) => <option key={m} value={m}>{m}月</option>)}
                </select>
                <select value={birthDay && birthMonth ? Math.min(birthDay, maxDay) : ""} onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : "")} className={cn(inputBase, "flex-1")}>
                  <option value="">日</option>
                  {birthDays.map((d) => <option key={d} value={d}>{d}日</option>)}
                </select>
              </div>
            </div>

            {/* メールアドレス（表示のみ） */}
            <div className="mt-4">
              <label className={labelClass}>メールアドレス</label>
              <input type="email" value={initialData.email ?? ""} disabled className={inputDisabledClass} />
              <p className={cn("text-xs mt-1", classes.textMuted)}>メールアドレスはこちらでは変更できません</p>
            </div>
          </section>

          {/* ── 学校情報 ── */}
          <section>
            <h2 className={sectionHeadingClass}>学校情報</h2>

            {/* 学校種別 */}
            <div>
              <label className={labelClass}>学校区分<span className="text-red-500 ml-0.5">*</span></label>
              <select
                value={form.school_type ?? ""}
                onChange={(e) => {
                  handleChange("school_type", e.target.value || null);
                  handleChange("school_name", "");
                  handleChange("school_kcode", null);
                  handleChange("faculty_name", "");
                  handleChange("department_name", "");
                  setFieldError("school_type", null);
                }}
                className={cn(inputBase, fieldErrors.school_type && inputErrorStyle)}
              >
                {SCHOOL_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              {fieldErrors.school_type && <p className={fieldErrorClass} data-field-error>{fieldErrors.school_type}</p>}
            </div>

            {/* 学校名 */}
            <div className="mt-4">
              <label className={labelClass}>学校名<span className="text-red-500 ml-0.5">*</span></label>
              <SuggestInput
                value={form.school_name ?? ""}
                onChange={(v) => { handleChange("school_name", v); setFieldError("school_name", null); }}
                onSelect={(item: SuggestItem) => {
                  handleChange("school_name", item.value);
                  handleChange("school_kcode", item.meta?.school_kcode ?? null);
                  handleChange("faculty_name", "");
                  handleChange("department_name", "");
                  setFieldError("school_name", null);
                }}
                fetchSuggestions={async (q) => {
                  const r = await searchSchoolNames(q, form.school_type ?? undefined);
                  return (r.data ?? []).map((d) => ({
                    label: d.school_name,
                    value: d.school_name,
                    meta: { school_kcode: d.school_kcode },
                  }));
                }}
                cacheScope={form.school_type ?? ""}
                placeholder="例：〇〇大学"
                hasError={!!fieldErrors.school_name}
              />
              {fieldErrors.school_name && <p className={fieldErrorClass} data-field-error>{fieldErrors.school_name}</p>}
            </div>

            {/* 学部・学科 */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>学部<span className="text-red-500 ml-0.5">*</span></label>
                <SuggestInput
                  value={form.faculty_name ?? ""}
                  onChange={(v) => { handleChange("faculty_name", v); handleChange("department_name", ""); setFieldError("faculty_name", null); }}
                  onSelect={(item: SuggestItem) => {
                    handleChange("faculty_name", item.value);
                    handleChange("department_name", "");
                    setFieldError("faculty_name", null);
                  }}
                  fetchSuggestions={async (q) => {
                    const r = await searchFacultyNames(form.school_kcode ?? "", q);
                    return (r.data ?? []).map((d) => ({ label: d.faculty_name, value: d.faculty_name }));
                  }}
                  cacheScope={form.school_kcode ?? ""}
                  showOnFocus
                  placeholder="例：〇〇学部"
                  hasError={!!fieldErrors.faculty_name}
                />
                {fieldErrors.faculty_name && <p className={fieldErrorClass} data-field-error>{fieldErrors.faculty_name}</p>}
              </div>
              <div>
                <label className={labelClass}>学科<span className="text-red-500 ml-0.5">*</span></label>
                <SuggestInput
                  value={form.department_name ?? ""}
                  onChange={(v) => { handleChange("department_name", v); setFieldError("department_name", null); }}
                  onSelect={(item: SuggestItem) => {
                    handleChange("department_name", item.value);
                    setFieldError("department_name", null);
                  }}
                  fetchSuggestions={async (q) => {
                    const r = await searchDepartmentNames(form.school_kcode ?? "", form.faculty_name ?? "", q);
                    return (r.data ?? []).map((d) => ({ label: d.department_name, value: d.department_name }));
                  }}
                  cacheScope={`${form.school_kcode ?? ""}:${form.faculty_name ?? ""}`}
                  showOnFocus
                  placeholder="例：〇〇学科"
                  hasError={!!fieldErrors.department_name}
                />
                {fieldErrors.department_name && <p className={fieldErrorClass} data-field-error>{fieldErrors.department_name}</p>}
              </div>
            </div>

            {/* 文理区分 */}
            <div className="mt-4">
              <label className={labelClass}>文理区分<span className="text-red-500 ml-0.5">*</span></label>
              <div className="flex gap-2 pt-0.5">
                {MAJOR_CATEGORIES.map((m) => (
                  <label key={m.value} className="flex flex-1 min-w-0">
                    <span className={radioLabelClass}>
                      <input
                        type="radio"
                        name="major_field"
                        value={m.value}
                        checked={form.major_field === m.value}
                        onChange={() => { handleChange("major_field", m.value); setFieldError("major_field", null); }}
                        className="h-3.5 w-3.5 shrink-0 accent-red-500"
                      />
                      {m.label}
                    </span>
                  </label>
                ))}
              </div>
              {fieldErrors.major_field && <p className={fieldErrorClass} data-field-error>{fieldErrors.major_field}</p>}
            </div>

            {/* 卒業年度 */}
            <div className="mt-4">
              <label className={labelClass}>卒業年<span className="text-red-500 ml-0.5">*</span></label>
              <select
                value={form.graduation_year ?? ""}
                onChange={(e) => { handleChange("graduation_year", e.target.value ? Number(e.target.value) : null); setFieldError("graduation_year", null); }}
                className={cn(inputBase, fieldErrors.graduation_year && inputErrorStyle)}
              >
                <option value="">選択してください</option>
                {graduationYears.map((y) => <option key={y} value={y}>{getGraduationYearLabel(y)}</option>)}
              </select>
              {fieldErrors.graduation_year && <p className={fieldErrorClass} data-field-error>{fieldErrors.graduation_year}</p>}
            </div>
          </section>

          {/* ── 志望情報 ── */}
          <section>
            <h2 className={sectionHeadingClass}>志望情報</h2>

            {/* 希望勤務地 */}
            <div className="mb-4">
              <label className={labelClass}>希望勤務地<span className="text-red-500 ml-0.5">*</span></label>
              <select
                value={form.desired_work_location ?? ""}
                onChange={(e) => { handleChange("desired_work_location", e.target.value || null); setFieldError("desired_work_location", null); }}
                className={cn(inputBase, fieldErrors.desired_work_location && inputErrorStyle)}
              >
                <option value="">選択してください</option>
                {PREFECTURES.map((pref: string) => <option key={pref} value={pref}>{pref}</option>)}
              </select>
              {fieldErrors.desired_work_location && <p className={fieldErrorClass} data-field-error>{fieldErrors.desired_work_location}</p>}
            </div>

            {/* 興味のある業界 */}
            <div className="mb-4">
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>興味のある業界（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {DESIRED_INDUSTRIES.map((industry) => (
                  <button
                    type="button"
                    key={industry}
                    onClick={() => handleMultiToggle("desired_industry", industry)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      form.desired_industry.includes(industry)
                        ? "border-red-500 bg-red-50 text-gray-900"
                        : isDark
                          ? "border-gray-700 bg-transparent text-gray-400 hover:border-gray-500"
                          : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400"
                    )}
                  >
                    {industry}
                  </button>
                ))}
              </div>
            </div>

            {/* 興味のある職種 */}
            <div>
              <label className={cn("block text-sm font-medium mb-2", isDark ? "text-gray-300" : "text-gray-700")}>興味のある職種（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {DESIRED_JOB_TYPES.map((jobType) => (
                  <button
                    type="button"
                    key={jobType}
                    onClick={() => handleMultiToggle("desired_job_type", jobType)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm border transition-colors",
                      form.desired_job_type.includes(jobType)
                        ? "border-red-500 bg-red-50 text-gray-900"
                        : isDark
                          ? "border-gray-700 bg-transparent text-gray-400 hover:border-gray-500"
                          : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400"
                    )}
                  >
                    {jobType}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 保存結果メッセージ */}
          {message && (
            <div
              ref={messageRef}
              className={cn(
                "px-4 py-3 rounded-lg text-sm border",
                message.type === "success"
                  ? isDark
                    ? "bg-green-900/30 border-green-700 text-green-400"
                    : "bg-green-50 border-green-300 text-green-700"
                  : isDark
                    ? "bg-red-900/30 border-red-700 text-red-400"
                    : "bg-red-50 border-red-300 text-red-600"
              )}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </form>
      </div>
    </div>
  );
}
