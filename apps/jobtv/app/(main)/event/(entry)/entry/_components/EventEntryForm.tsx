"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  createPublicEventReservation,
  createReservationForExistingCandidate,
  signUpAndReserveEvent,
  type EventForReservation,
} from "@/lib/actions/event-reservation-actions";
import { checkEmailForSignup } from "@/lib/actions/auth-actions";
import { searchSchoolNames, searchFacultyNames, searchDepartmentNames } from "@/lib/actions/school-actions";
import SuggestInput from "@/components/common/SuggestInput";
import { validateEmail, validatePhone, validatePassword, validateKana } from "@/lib/utils/signup-validation";
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
import EventDateSelector from "./EventDateSelector";
import { cn } from "@jobtv-app/shared/utils/cn";
import TurnstileWidget from "@/components/common/TurnstileWidget";

const inputClass =
  "w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all";
const inputErrorClass = "border-red-500 bg-red-50/50";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const fieldErrorClass = "mt-0.5 text-xs text-red-600";

interface Props {
  events: EventForReservation[];
  isLoggedInCandidate: boolean;
}

export default function EventEntryForm({ events, isLoggedInCandidate }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 共通 state
  const [selectedEventId, setSelectedEventId] = useState("");
  const [webConsultation, setWebConsultation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // メール入力（未ログイン時のみ）
  const [emailInput, setEmailInput] = useState("");
  const [emailForSignup, setEmailForSignup] = useState("");
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // メールチェック結果
  const [existingCandidate, setExistingCandidate] = useState(false);
  const [newCandidate, setNewCandidate] = useState(false);
  const confirmed = existingCandidate || newCandidate;

  // 会員登録フォーム state
  const [birthYear, setBirthYear] = useState(getBirthYearDefault());
  const [birthMonth, setBirthMonth] = useState<number | "">("");
  const [birthDay, setBirthDay] = useState<number | "">("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [schoolType, setSchoolType] = useState(SCHOOL_TYPE_DEFAULT);
  const [schoolName, setSchoolName] = useState("");
  const [schoolKcode, setSchoolKcode] = useState<string | null>(null);
  const [facultyName, setFacultyName] = useState("");
  const [departmentName, setDepartmentName] = useState("");

  // Turnstile token（既存候補者の手動予約用）
  const [captchaToken, setCaptchaToken] = useState("");

  // UTM
  const [referrer, setReferrer] = useState("");
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "", content: "", term: "" });

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
      term: searchParams.get("utm_term") ?? "",
    });
  }, [searchParams]);

  // ログイン済み candidate: 日程選択 → 予約
  async function handleLoggedInSubmit() {
    if (!selectedEventId) {
      setError("イベント日程を選択してください");
      return;
    }
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.set("event_id", selectedEventId);
    fd.set("web_consultation", String(webConsultation));
    fd.set("referrer", referrer);
    fd.set("utm_source", utm.source);
    fd.set("utm_medium", utm.medium);
    fd.set("utm_campaign", utm.campaign);
    fd.set("utm_content", utm.content);
    fd.set("utm_term", utm.term);

    const result = await createPublicEventReservation(fd);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push(`/event/entry/thanks?event_id=${result.data!.eventId}`);
  }

  // 未ログイン: メールチェック
  async function handleEmailNext() {
    if (!selectedEventId) {
      setError("イベント日程を選択してください");
      return;
    }
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
    setEmailForSignup(email);

    if (result.status === "available") {
      setNewCandidate(true);
      return;
    }
    if (result.status === "candidate_exists") {
      setExistingCandidate(true);
      return;
    }
    if (result.status === "recruiter_or_admin_exists") {
      setCheckError("このメールアドレスでは登録できません。別のメールアドレスをお試しください。");
    }
  }

  // 未ログイン: 既存候補者 → 予約確定
  async function handleExistingCandidateReserve() {
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("email", emailForSignup);
    fd.set("event_id", selectedEventId);
    fd.set("web_consultation", String(webConsultation));
    fd.set("referrer", referrer);
    fd.set("utm_source", utm.source);
    fd.set("utm_medium", utm.medium);
    fd.set("utm_campaign", utm.campaign);
    fd.set("utm_content", utm.content);
    fd.set("utm_term", utm.term);
    fd.set("captchaToken", captchaToken);
    const reserveResult = await createReservationForExistingCandidate(fd);
    setLoading(false);
    if (reserveResult.error) {
      setError(reserveResult.error);
      return;
    }
    router.push(`/event/entry/thanks?event_id=${reserveResult.data!.eventId}`);
  }

  // 未ログイン: 会員登録 + 予約
  async function handleSignupAndReserve(formData: FormData) {
    const year = formData.get("birth_year");
    const month = formData.get("birth_month");
    const day = formData.get("birth_day");
    if (year && month && day) {
      formData.set("date_of_birth", formatDateOfBirth(Number(year), Number(month), Number(day)));
    }
    setLoading(true);
    setError(null);
    const result = await signUpAndReserveEvent(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push(`/event/entry/thanks?event_id=${result.data!.eventId}`);
  }

  const utmHiddenInputs = (
    <>
      <input type="hidden" name="referrer" value={referrer} />
      <input type="hidden" name="utm_source" value={utm.source} />
      <input type="hidden" name="utm_medium" value={utm.medium} />
      <input type="hidden" name="utm_campaign" value={utm.campaign} />
      <input type="hidden" name="utm_content" value={utm.content} />
      <input type="hidden" name="utm_term" value={utm.term} />
    </>
  );

  // ============================================================
  // ログイン済み candidate フロー
  // ============================================================
  if (isLoggedInCandidate) {
    return (
      <div className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
        <div className="space-y-6">
          <EventDateSelector events={events} selectedId={selectedEventId} onSelect={setSelectedEventId} />

          <div>
            <span className={labelClass}>就活お悩みWEB相談（無料）</span>
            <p className="text-xs text-gray-500 mb-2">無料で弊社専属のキャリアアドバイザーに、就活のお悩みをWEB面談にてご相談いただけます。<br />※別途日程調整フォームが送信されます。</p>
            <div className="flex gap-2">
              {[
                { value: true, label: "希望する" },
                { value: false, label: "希望しない" },
              ].map((opt) => (
                <label key={String(opt.value)} className="flex flex-1 min-w-0 cursor-pointer">
                  <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                    <input
                      type="radio"
                      name="web_consultation_radio"
                      checked={webConsultation === opt.value}
                      onChange={() => setWebConsultation(opt.value)}
                      className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 text-red-500 accent-red-500"
                    />
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs">{error}</div>
          )}

          <button
            type="button"
            onClick={handleLoggedInSubmit}
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
                予約中...
              </span>
            ) : (
              "予約する"
            )}
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // 未ログインフロー
  // ============================================================
  return (
    <form action={newCandidate ? handleSignupAndReserve : undefined} className="bg-white py-5 px-6 md:py-10 md:px-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-2 max-sm:py-4">
      {newCandidate && (
        <>
          {utmHiddenInputs}
          <input type="hidden" name="email" value={emailForSignup} />
          <input type="hidden" name="event_id" value={selectedEventId} />
          <input type="hidden" name="web_consultation" value={String(webConsultation)} />
        </>
      )}
      <div className="space-y-6">
            <EventDateSelector events={events} selectedId={selectedEventId} onSelect={setSelectedEventId} disabled={confirmed} />

            <div>
              <span className={labelClass}>就活お悩みWEB相談（無料）</span>
              <p className="text-xs text-gray-500 mb-2">無料で弊社専属のキャリアアドバイザーに、就活のお悩みをWEB面談にてご相談いただけます。<br />※別途日程調整フォームが送信されます。</p>
              <div className={cn("flex gap-2", confirmed && "opacity-60")}>
                {[
                  { value: true, label: "希望する" },
                  { value: false, label: "希望しない" },
                ].map((opt) => (
                  <label key={String(opt.value)} className={cn("flex flex-1 min-w-0", confirmed ? "cursor-default" : "cursor-pointer")}>
                    <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                      <input
                        type="radio"
                        name="web_consultation_radio"
                        checked={webConsultation === opt.value}
                        onChange={() => setWebConsultation(opt.value)}
                        disabled={confirmed}
                        className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 text-red-500 accent-red-500"
                      />
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                {confirmed && (
                  <button
                    type="button"
                    onClick={() => { setExistingCandidate(false); setNewCandidate(false); setError(null); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    変更
                  </button>
                )}
              </div>
              <input
                type="email"
                id="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) ?? "" }));
                }}
                onBlur={(e) =>
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) ?? "" }))
                }
                disabled={confirmed}
                className={cn(inputClass, fieldErrors.email && inputErrorClass, confirmed && "opacity-60")}
                placeholder="example@jobtv.jp"
              />
              {fieldErrors.email && <p className={fieldErrorClass}>{fieldErrors.email}</p>}
            </div>

            {checkError && <p className={fieldErrorClass}>{checkError}</p>}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs">{error}</div>
            )}

            {existingCandidate && (
              <>
                <p className="text-gray-700 text-xs text-center">
                  <a href="/docs/terms" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">利用規約</a>
                  および
                  <a href="https://vectorinc.co.jp/privacy" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">プライバシーポリシー</a>
                  に同意のうえ、予約を確定してください。
                </p>
                <button
                  type="button"
                  onClick={handleExistingCandidateReserve}
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
                      予約中...
                    </span>
                  ) : (
                    "予約する"
                  )}
                </button>
              </>
            )}

            {!confirmed && (
              <TurnstileWidget theme="light" action="event-entry" onToken={setCaptchaToken} />
            )}

            {!confirmed && (
              <button
                type="button"
                onClick={handleEmailNext}
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
                ) : (
                  "次へ"
                )}
              </button>
            )}

            {/* 新規会員登録フォーム（インライン） */}
            {newCandidate && (
              <>
                <p className="text-center text-sm text-gray-600 !mt-10">必要情報を入力してください</p>

                {/* 氏名 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="last_name" className={labelClass}>氏名（姓）</label>
                    <input type="text" id="last_name" name="last_name" required className={inputClass} placeholder="山田" />
                  </div>
                  <div>
                    <label htmlFor="first_name" className={labelClass}>氏名（名）</label>
                    <input type="text" id="first_name" name="first_name" required className={inputClass} placeholder="太郎" />
                  </div>
                </div>

                {/* カナ */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="last_name_kana" className={labelClass}>氏名（姓カナ）</label>
                    <input
                      type="text" id="last_name_kana" name="last_name_kana" required
                      className={cn(inputClass, fieldErrors.last_name_kana && inputErrorClass)} placeholder="ヤマダ"
                      onBlur={(e) => setFieldErrors((prev) => ({ ...prev, last_name_kana: validateKana(e.target.value) ?? "" }))}
                      onChange={(e) => setFieldErrors((prev) => ({ ...prev, last_name_kana: validateKana(e.target.value) ?? "" }))}
                    />
                    {fieldErrors.last_name_kana && <p className={fieldErrorClass}>{fieldErrors.last_name_kana}</p>}
                  </div>
                  <div>
                    <label htmlFor="first_name_kana" className={labelClass}>氏名（名カナ）</label>
                    <input
                      type="text" id="first_name_kana" name="first_name_kana" required
                      className={cn(inputClass, fieldErrors.first_name_kana && inputErrorClass)} placeholder="タロウ"
                      onBlur={(e) => setFieldErrors((prev) => ({ ...prev, first_name_kana: validateKana(e.target.value) ?? "" }))}
                      onChange={(e) => setFieldErrors((prev) => ({ ...prev, first_name_kana: validateKana(e.target.value) ?? "" }))}
                    />
                    {fieldErrors.first_name_kana && <p className={fieldErrorClass}>{fieldErrors.first_name_kana}</p>}
                  </div>
                </div>

                {/* 性別 */}
                <div>
                  <span className={labelClass}>性別</span>
                  <div className="flex gap-2 pt-0.5">
                    {GENDERS.map((g) => (
                      <label key={g.value} className="flex flex-1 min-w-0 cursor-pointer">
                        <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                          <input type="radio" name="gender" value={g.value} required className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 text-red-500 accent-red-500" />
                          {g.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 希望勤務地 */}
                <div>
                  <label htmlFor="desired_work_location" className={labelClass}>希望勤務地</label>
                  <select id="desired_work_location" name="desired_work_location" required className={inputClass}>
                    <option value="">選択してください</option>
                    {PREFECTURES.map((pref: string) => (
                      <option key={pref} value={pref}>{pref}</option>
                    ))}
                  </select>
                </div>

                {/* 生年月日 */}
                <div>
                  <span className={labelClass}>生年月日</span>
                  <div className="flex gap-2 mt-0.5">
                    <select id="birth_year" name="birth_year" required className={cn(inputClass, "flex-1")} value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))}>
                      {getBirthYears().map((y) => (<option key={y} value={y}>{y}年</option>))}
                    </select>
                    <select id="birth_month" name="birth_month" required className={cn(inputClass, "flex-1")} value={birthMonth} onChange={(e) => { setBirthMonth(e.target.value ? Number(e.target.value) : ""); setBirthDay(""); }}>
                      <option value="">月</option>
                      {BIRTH_MONTHS.map((m) => (<option key={m} value={m}>{m}月</option>))}
                    </select>
                    <select id="birth_day" name="birth_day" required className={cn(inputClass, "flex-1")} value={clampedBirthDay} onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : "")}>
                      <option value="">日</option>
                      {birthDays.map((d) => (<option key={d} value={d}>{d}日</option>))}
                    </select>
                  </div>
                </div>

                {/* 電話番号 */}
                <div>
                  <label htmlFor="phone" className={labelClass}>電話番号（ハイフンなし）</label>
                  <input
                    type="tel" id="phone" name="phone" required
                    className={cn(inputClass, fieldErrors.phone && inputErrorClass)} placeholder="09012345678"
                    onBlur={(e) => setFieldErrors((prev) => ({ ...prev, phone: validatePhone(e.target.value) ?? "" }))}
                    onChange={(e) => setFieldErrors((prev) => ({ ...prev, phone: validatePhone(e.target.value) ?? "" }))}
                  />
                  {fieldErrors.phone && <p className={fieldErrorClass}>{fieldErrors.phone}</p>}
                </div>

                {/* 学校区分 */}
                <div>
                  <label htmlFor="school_type" className={labelClass}>学校区分</label>
                  <select id="school_type" name="school_type" required className={inputClass} value={schoolType} onChange={(e) => { setSchoolType(e.target.value as typeof schoolType); setSchoolName(""); setSchoolKcode(null); setFacultyName(""); setDepartmentName(""); }}>
                    {SCHOOL_TYPES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                </div>

                {/* 学校名 */}
                <div>
                  <label htmlFor="school_name" className={labelClass}>学校名</label>
                  <SuggestInput
                    name="school_name" value={schoolName}
                    onChange={(v) => { setSchoolName(v); setSchoolKcode(null); setFacultyName(""); setDepartmentName(""); }}
                    onSelect={(item) => { setSchoolName(item.value); setSchoolKcode(item.meta?.school_kcode ?? null); setFacultyName(""); setDepartmentName(""); }}
                    fetchSuggestions={async (q) => { const r = await searchSchoolNames(q, schoolType); return (r.data ?? []).map((d) => ({ label: d.school_name, value: d.school_name, meta: { school_kcode: d.school_kcode } })); }}
                    cacheScope={schoolType} placeholder="例：〇〇大学"
                  />
                  <input type="hidden" name="school_kcode" value={schoolKcode ?? ""} />
                </div>

                {/* 学部・学科 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="faculty_name" className={labelClass}>学部</label>
                    <SuggestInput
                      name="faculty_name" value={facultyName}
                      onChange={(v) => { setFacultyName(v); setDepartmentName(""); }}
                      onSelect={(item) => { setFacultyName(item.value); setDepartmentName(""); }}
                      fetchSuggestions={async (q) => { const r = await searchFacultyNames(schoolKcode ?? "", q); return (r.data ?? []).map((d) => ({ label: d.faculty_name, value: d.faculty_name })); }}
                      cacheScope={schoolKcode ?? ""} showOnFocus placeholder="例：〇〇学部"
                    />
                  </div>
                  <div>
                    <label htmlFor="department_name" className={labelClass}>学科</label>
                    <SuggestInput
                      name="department_name" value={departmentName}
                      onChange={setDepartmentName}
                      onSelect={(item) => setDepartmentName(item.value)}
                      fetchSuggestions={async (q) => { const r = await searchDepartmentNames(schoolKcode ?? "", facultyName, q); return (r.data ?? []).map((d) => ({ label: d.department_name, value: d.department_name })); }}
                      cacheScope={`${schoolKcode ?? ""}:${facultyName}`} showOnFocus placeholder="例：〇〇学科"
                    />
                  </div>
                </div>

                {/* 文理区分 */}
                <div>
                  <span className={labelClass}>文理区分</span>
                  <div className="flex gap-2 pt-0.5">
                    {MAJOR_CATEGORIES.map((m) => (
                      <label key={m.value} className="flex flex-1 min-w-0 cursor-pointer">
                        <span className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 transition-colors has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
                          <input type="radio" name="major_field" value={m.value} required className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-gray-300 text-red-500 accent-red-500" />
                          {m.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 卒業年 */}
                <div>
                  <label htmlFor="graduation_year" className={labelClass}>卒業年</label>
                  <select id="graduation_year" name="graduation_year" required className={inputClass} defaultValue={getGraduationYearDefault()}>
                    {getGraduationYears().map((y) => (<option key={y} value={y}>{getGraduationYearLabel(y)}</option>))}
                  </select>
                </div>

                {/* 業界 */}
                <div>
                  <span className={labelClass}>興味のある業界</span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {DESIRED_INDUSTRIES.map((ind) => {
                      const selected = selectedIndustries.includes(ind);
                      return (
                        <button key={ind} type="button"
                          onClick={() => setSelectedIndustries((prev) => prev.includes(ind) ? prev.filter((x) => x !== ind) : [...prev, ind])}
                          className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", selected ? "border-red-500 bg-red-50 text-gray-900" : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400")}
                        >{ind}</button>
                      );
                    })}
                  </div>
                  {selectedIndustries.map((ind) => (<input key={ind} type="hidden" name="desired_industry" value={ind} />))}
                </div>

                {/* 職種 */}
                <div>
                  <span className={labelClass}>興味のある職種</span>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {DESIRED_JOB_TYPES.map((job) => {
                      const selected = selectedJobTypes.includes(job);
                      return (
                        <button key={job} type="button"
                          onClick={() => setSelectedJobTypes((prev) => prev.includes(job) ? prev.filter((x) => x !== job) : [...prev, job])}
                          className={cn("rounded-full border px-3 py-1.5 text-sm transition-colors", selected ? "border-red-500 bg-red-50 text-gray-900" : "border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400")}
                        >{job}</button>
                      );
                    })}
                  </div>
                  {selectedJobTypes.map((job) => (<input key={job} type="hidden" name="desired_job_type" value={job} />))}
                </div>

                {/* パスワード */}
                <div>
                  <label htmlFor="password" className={labelClass}>パスワード</label>
                  <input
                    type="password" id="password" name="password" required minLength={8}
                    className={cn(inputClass, fieldErrors.password && inputErrorClass)} placeholder="英数字を含む8文字以上"
                    onBlur={(e) => setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) ?? "" }))}
                    onChange={(e) => setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) ?? "" }))}
                  />
                  {fieldErrors.password && <p className={fieldErrorClass}>{fieldErrors.password}</p>}
                </div>

                <p className="text-gray-700 text-xs text-center">
                  <a href="/docs/terms" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">利用規約</a>
                  および
                  <a href="https://vectorinc.co.jp/privacy" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">プライバシーポリシー</a>
                  に同意のうえ、下のボタンから送信してください。
                </p>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-xs">{error}</div>
                )}

                <TurnstileWidget theme="light" action="event-signup" />

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
                  ) : (
                    "同意して予約する"
                  )}
                </button>
              </>
            )}
      </div>
    </form>
  );
}
