"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signUp, checkEmailForSignup } from "@/lib/actions/auth-actions";
import { searchSchoolNames, searchFacultyNames, searchDepartmentNames } from "@/lib/actions/school-actions";
import SuggestInput from "@/components/common/SuggestInput";
import { primaryButtonClass } from "@/constants/navigation";
import { Loader2 } from "lucide-react";
import { PREFECTURES } from "@/constants/prefectures";
import {
  GENDERS,
  SCHOOL_TYPES,
  SCHOOL_TYPE_DEFAULT,
  MAJOR_CATEGORIES,
  getGraduationYears,
  getGraduationYearDefault,
  getGraduationYearLabel,
  getBirthYears,
  getBirthYearDefault,
  BIRTH_MONTHS,
  getBirthDays,
  getDaysInMonth,
  DESIRED_INDUSTRIES,
  DESIRED_JOB_TYPES,
  formatDateOfBirth,
} from "@/constants/signup-options";
import { validateEmail, validatePhone, validatePassword, validateKana } from "@/lib/utils/signup-validation";
import Link from "next/link";
import { cn } from "@jobtv-app/shared/utils/cn";
import TurnstileWidget from "@/components/common/TurnstileWidget";

const inputClass =
  "w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all";
const inputErrorClass = "border-red-500 bg-red-50/50";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const fieldErrorClass = "mt-0.5 text-xs text-red-600";

function SignUpPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [referrer, setReferrer] = useState("");
  const [utm, setUtm] = useState({
    source: "",
    medium: "",
    campaign: "",
    content: "",
    term: ""
  });
  const [birthYear, setBirthYear] = useState(getBirthYearDefault());
  const [birthMonth, setBirthMonth] = useState<number | "">("");
  const [birthDay, setBirthDay] = useState<number | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [step, setStep] = useState<"email" | "form" | "candidate_exists" | "recruiter_or_admin_exists">("email");
  const [emailForSignup, setEmailForSignup] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [checkError, setCheckError] = useState<string | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [schoolType, setSchoolType] = useState(SCHOOL_TYPE_DEFAULT);
  const [schoolName, setSchoolName] = useState("");
  const [schoolKcode, setSchoolKcode] = useState<string | null>(null);
  const [facultyName, setFacultyName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  const birthDays = getBirthDays(birthYear, birthMonth || 1);
  const maxDay = getDaysInMonth(birthYear, birthMonth || 1);
  const clampedBirthDay = birthDay && birthDay > maxDay ? maxDay : birthDay;

  useEffect(() => {
    if (birthMonth && birthDay && birthDay > maxDay) setBirthDay(maxDay);
  }, [birthYear, birthMonth, maxDay, birthDay]);

  useEffect(() => {
    if (typeof document !== "undefined") setReferrer(document.referrer ?? "");
    setUtm({
      source: searchParams.get("utm_source") ?? "",
      medium: searchParams.get("utm_medium") ?? "",
      campaign: searchParams.get("utm_campaign") ?? "",
      content: searchParams.get("utm_content") ?? "",
      term: searchParams.get("utm_term") ?? ""
    });
  }, [searchParams]);

  async function handleSubmit(formData: FormData) {
    const year = formData.get("birth_year");
    const month = formData.get("birth_month");
    const day = formData.get("birth_day");
    if (year && month && day) {
      formData.set("date_of_birth", formatDateOfBirth(Number(year), Number(month), Number(day)));
    }
    setLoading(true);
    setError(null);
    const result = await signUp(formData);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      router.push('/auth/signup/thanks');
    }
  }

  async function handleNext() {
    const email = emailInput.trim();
    const err = validateEmail(email);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, email: err }));
      return;
    }
    setFieldErrors((prev) => ({ ...prev, email: "" }));
    setCheckError(null);
    setLoadingCheck(true);
    const result = await checkEmailForSignup(email);
    setLoadingCheck(false);
    if (result.status === "error") {
      setCheckError(result.error);
      return;
    }
    setEmailForSignup(email.trim());
    if (result.status === "available") {
      setStep("form");
      return;
    }
    if (result.status === "candidate_exists") {
      setStep("candidate_exists");
      return;
    }
    if (result.status === "recruiter_or_admin_exists") {
      setStep("recruiter_or_admin_exists");
    }
  }

  return (
    <div className="flex items-center justify-center px-2 py-8 sm:px-4 bg-white">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">必要情報</h1>
          <p className="text-gray-600 text-xs">を入力してください</p>
        </div>

        <>
          {/* Step 1: メールアドレスのみ */}
          {step === "email" && (
            <div className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className={labelClass}>
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) ?? "" }));
                    }}
                    className={cn(inputClass, fieldErrors.email && inputErrorClass)}
                    placeholder="example@jobtv.jp"
                    onBlur={(e) => setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) ?? "" }))}
                  />
                  {fieldErrors.email && <p className={fieldErrorClass}>{fieldErrors.email}</p>}
                </div>
                {checkError && <p className={fieldErrorClass}>{checkError}</p>}
                <button
                  type="button"
                  onClick={() => handleNext()}
                  disabled={loadingCheck}
                  className={cn(
                    "mx-auto block w-auto min-w-[12rem] px-8 py-4 text-sm rounded-lg font-medium",
                    primaryButtonClass,
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {loadingCheck ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      確認中...
                    </span>
                  ) : "次へ"}
                </button>
              </div>
            </div>
          )}

          {/* すでに candidate アカウントがある場合 */}
          {step === "candidate_exists" && (
            <div className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
              <p className="text-gray-900 text-sm mb-4">すでにアカウントがあります。ログインしてください。</p>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/auth/login?email=${encodeURIComponent(emailForSignup)}${next ? `&next=${encodeURIComponent(next)}` : ""}`}
                  className={cn("w-full py-3 text-sm rounded-lg font-medium text-center", primaryButtonClass)}
                >
                  ログイン
                </Link>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full py-3 text-sm rounded-lg font-medium text-center border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  別のメールアドレスで登録
                </button>
              </div>
            </div>
          )}

          {/* 企業・管理者アカウントで存在する場合 */}
          {step === "recruiter_or_admin_exists" && (
            <div className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
              <p className="text-red-600 text-sm mb-4">このメールアドレスでは登録できません。</p>
              <button
                type="button"
                onClick={() => setStep("email")}
                className="w-full py-3 text-sm rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                別のメールアドレスを入力
              </button>
            </div>
          )}

          {/* Step 2: 残り項目のフォーム */}
          {step === "form" && (
            <>
              <div className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
                <form action={handleSubmit} className="space-y-6">
                  <input type="hidden" name="referrer" value={referrer} />
                  <input type="hidden" name="utm_source" value={utm.source} />
                  <input type="hidden" name="utm_medium" value={utm.medium} />
                  <input type="hidden" name="utm_campaign" value={utm.campaign} />
                  <input type="hidden" name="utm_content" value={utm.content} />
                  <input type="hidden" name="utm_term" value={utm.term} />
                  <input type="hidden" name="email" value={emailForSignup} />

                  <div>
                    <span className={labelClass}>メールアドレス</span>
                    <div className="flex items-center justify-between gap-2 py-2">
                      <p className="text-sm text-gray-700">{emailForSignup}</p>
                      <button
                        type="button"
                        onClick={() => setStep("email")}
                        className="text-xs text-red-500 hover:underline shrink-0"
                      >
                        変更
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-sm text-gray-600">必要情報を入力してください</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="last_name" className={labelClass}>
                        氏名（姓）
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        name="last_name"
                        required
                        className={inputClass}
                        placeholder="山田"
                      />
                    </div>
                    <div>
                      <label htmlFor="first_name" className={labelClass}>
                        氏名（名）
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        name="first_name"
                        required
                        className={inputClass}
                        placeholder="太郎"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="last_name_kana" className={labelClass}>
                        氏名（姓カナ）
                      </label>
                      <input
                        type="text"
                        id="last_name_kana"
                        name="last_name_kana"
                        required
                        className={cn(inputClass, fieldErrors.last_name_kana && inputErrorClass)}
                        placeholder="ヤマダ"
                        onBlur={(e) =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            last_name_kana: validateKana(e.target.value) ?? ""
                          }))
                        }
                        onChange={(e) =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            last_name_kana: validateKana(e.target.value) ?? ""
                          }))
                        }
                      />
                      {fieldErrors.last_name_kana && <p className={fieldErrorClass}>{fieldErrors.last_name_kana}</p>}
                    </div>
                    <div>
                      <label htmlFor="first_name_kana" className={labelClass}>
                        氏名（名カナ）
                      </label>
                      <input
                        type="text"
                        id="first_name_kana"
                        name="first_name_kana"
                        required
                        className={cn(inputClass, fieldErrors.first_name_kana && inputErrorClass)}
                        placeholder="タロウ"
                        onBlur={(e) =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            first_name_kana: validateKana(e.target.value) ?? ""
                          }))
                        }
                        onChange={(e) =>
                          setFieldErrors((prev) => ({
                            ...prev,
                            first_name_kana: validateKana(e.target.value) ?? ""
                          }))
                        }
                      />
                      {fieldErrors.first_name_kana && <p className={fieldErrorClass}>{fieldErrors.first_name_kana}</p>}
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>性別</span>
                    <div className="flex gap-2 pt-0.5">
                      {GENDERS.map((g) => (
                        <label key={g.value} className="flex flex-1 min-w-0 cursor-pointer">
                          <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                            <input
                              type="radio"
                              name="gender"
                              value={g.value}
                              required
                              className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 text-red-500 accent-red-500"
                            />
                            {g.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="desired_work_location" className={labelClass}>
                      希望勤務地
                    </label>
                    <select id="desired_work_location" name="desired_work_location" required className={inputClass}>
                      <option value="">選択してください</option>
                      {PREFECTURES.map((pref: string) => (
                        <option key={pref} value={pref}>
                          {pref}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className={labelClass}>生年月日</span>
                    <div className="flex gap-2 mt-0.5">
                      <select
                        id="birth_year"
                        name="birth_year"
                        required
                        className={cn(inputClass, "flex-1")}
                        value={birthYear}
                        onChange={(e) => setBirthYear(Number(e.target.value))}
                      >
                        {getBirthYears().map((y) => (
                          <option key={y} value={y}>
                            {y}年
                          </option>
                        ))}
                      </select>
                      <select
                        id="birth_month"
                        name="birth_month"
                        required
                        className={cn(inputClass, "flex-1")}
                        value={birthMonth}
                        onChange={(e) => { setBirthMonth(e.target.value ? Number(e.target.value) : ""); setBirthDay(""); }}
                      >
                        <option value="">月</option>
                        {BIRTH_MONTHS.map((m) => (
                          <option key={m} value={m}>
                            {m}月
                          </option>
                        ))}
                      </select>
                      <select
                        id="birth_day"
                        name="birth_day"
                        required
                        className={cn(inputClass, "flex-1")}
                        value={clampedBirthDay}
                        onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : "")}
                      >
                        <option value="">日</option>
                        {birthDays.map((d) => (
                          <option key={d} value={d}>
                            {d}日
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      電話番号（ハイフンなし）
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      className={cn(inputClass, fieldErrors.phone && inputErrorClass)}
                      placeholder="09012345678"
                      onBlur={(e) =>
                        setFieldErrors((prev) => ({ ...prev, phone: validatePhone(e.target.value) ?? "" }))
                      }
                      onChange={(e) =>
                        setFieldErrors((prev) => ({ ...prev, phone: validatePhone(e.target.value) ?? "" }))
                      }
                    />
                    {fieldErrors.phone && <p className={fieldErrorClass}>{fieldErrors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="school_type" className={labelClass}>
                      学校区分
                    </label>
                    <select
                      id="school_type"
                      name="school_type"
                      required
                      className={inputClass}
                      value={schoolType}
                      onChange={(e) => {
                        setSchoolType(e.target.value as typeof schoolType);
                        setSchoolName("");
                        setSchoolKcode(null);
                        setFacultyName("");
                        setDepartmentName("");
                      }}
                    >
                      {SCHOOL_TYPES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="school_name" className={labelClass}>
                      学校名
                    </label>
                    <SuggestInput
                      name="school_name"
                      value={schoolName}
                      onChange={(v) => { setSchoolName(v); setSchoolKcode(null); setFacultyName(""); setDepartmentName(""); }}
                      onSelect={(item) => {
                        setSchoolName(item.value);
                        setSchoolKcode(item.meta?.school_kcode ?? null);
                        setFacultyName("");
                        setDepartmentName("");
                      }}
                      fetchSuggestions={async (q) => {
                        const r = await searchSchoolNames(q, schoolType);
                        return (r.data ?? []).map((d) => ({
                          label: d.school_name,
                          value: d.school_name,
                          meta: { school_kcode: d.school_kcode },
                        }));
                      }}
                      cacheScope={schoolType}
                      placeholder="例：〇〇大学"
                    />
                    <input type="hidden" name="school_kcode" value={schoolKcode ?? ""} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="faculty_name" className={labelClass}>
                        学部
                      </label>
                      <SuggestInput
                        name="faculty_name"
                        value={facultyName}
                        onChange={(v) => { setFacultyName(v); setDepartmentName(""); }}
                        onSelect={(item) => { setFacultyName(item.value); setDepartmentName(""); }}
                        fetchSuggestions={async (q) => {
                          const r = await searchFacultyNames(schoolKcode ?? "", q);
                          return (r.data ?? []).map((d) => ({ label: d.faculty_name, value: d.faculty_name }));
                        }}
                        cacheScope={schoolKcode ?? ""}
                        showOnFocus
                        placeholder="例：〇〇学部"
                      />
                    </div>
                    <div>
                      <label htmlFor="department_name" className={labelClass}>
                        学科
                      </label>
                      <SuggestInput
                        name="department_name"
                        value={departmentName}
                        onChange={setDepartmentName}
                        onSelect={(item) => setDepartmentName(item.value)}
                        fetchSuggestions={async (q) => {
                          const r = await searchDepartmentNames(schoolKcode ?? "", facultyName, q);
                          return (r.data ?? []).map((d) => ({ label: d.department_name, value: d.department_name }));
                        }}
                        cacheScope={`${schoolKcode ?? ""}:${facultyName}`}
                        showOnFocus
                        placeholder="例：〇〇学科"
                      />
                    </div>
                  </div>

                  <div>
                    <span className={labelClass}>文理区分</span>
                    <div className="flex gap-2 pt-0.5">
                      {MAJOR_CATEGORIES.map((m) => (
                        <label key={m.value} className="flex flex-1 min-w-0 cursor-pointer">
                          <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                            <input
                              type="radio"
                              name="major_field"
                              value={m.value}
                              required
                              className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 text-red-500 accent-red-500"
                            />
                            {m.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="graduation_year" className={labelClass}>
                      卒業年
                    </label>
                    <select
                      id="graduation_year"
                      name="graduation_year"
                      required
                      className={inputClass}
                      defaultValue={getGraduationYearDefault()}
                    >
                      {getGraduationYears().map((y) => (
                        <option key={y} value={y}>
                          {getGraduationYearLabel(y)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className={labelClass}>興味のある業界</span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {DESIRED_INDUSTRIES.map((ind) => {
                        const selected = selectedIndustries.includes(ind);
                        return (
                          <button
                            key={ind}
                            type="button"
                            onClick={() =>
                              setSelectedIndustries((prev) =>
                                prev.includes(ind) ? prev.filter((x) => x !== ind) : [...prev, ind]
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              selected
                                ? "border-red-500 bg-red-50 text-gray-900"
                                : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400"
                            )}
                          >
                            {ind}
                          </button>
                        );
                      })}
                    </div>
                    {selectedIndustries.map((ind) => (
                      <input key={ind} type="hidden" name="desired_industry" value={ind} />
                    ))}
                  </div>

                  <div>
                    <span className={labelClass}>興味のある職種</span>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {DESIRED_JOB_TYPES.map((job) => {
                        const selected = selectedJobTypes.includes(job);
                        return (
                          <button
                            key={job}
                            type="button"
                            onClick={() =>
                              setSelectedJobTypes((prev) =>
                                prev.includes(job) ? prev.filter((x) => x !== job) : [...prev, job]
                              )
                            }
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              selected
                                ? "border-red-500 bg-red-50 text-gray-900"
                                : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400"
                            )}
                          >
                            {job}
                          </button>
                        );
                      })}
                    </div>
                    {selectedJobTypes.map((job) => (
                      <input key={job} type="hidden" name="desired_job_type" value={job} />
                    ))}
                  </div>

                  <div>
                    <label htmlFor="password" className={labelClass}>
                      パスワード
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      required
                      minLength={8}
                      className={cn(inputClass, fieldErrors.password && inputErrorClass)}
                      placeholder="英数字を含む8文字以上"
                      onBlur={(e) =>
                        setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) ?? "" }))
                      }
                      onChange={(e) =>
                        setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) ?? "" }))
                      }
                    />
                    {fieldErrors.password && <p className={fieldErrorClass}>{fieldErrors.password}</p>}
                  </div>

                  <p className="text-gray-700 text-xs text-center">
                    <a
                      href="/docs/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-500 hover:underline"
                    >
                      利用規約
                    </a>
                    および
                    <a
                      href="https://vectorinc.co.jp/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-500 hover:underline"
                    >
                      プライバシーポリシー
                    </a>
                    に同意のうえ、下のボタンから送信してください。
                  </p>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs">{error}</div>
                  )}

                  <TurnstileWidget theme="light" action="signup" />

                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "mx-auto block w-auto min-w-[12rem] px-8 py-4 text-sm rounded-lg font-medium",
                      primaryButtonClass,
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        送信中...
                      </span>
                    ) : "同意して無料で始める"}
                  </button>
                </form>
              </div>
            </>
          )}
        </>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-0 px-4 py-6 bg-white">
          <div className="animate-pulse text-gray-400">読み込み中...</div>
        </div>
      }
    >
      <SignUpPageContent />
    </Suspense>
  );
}
