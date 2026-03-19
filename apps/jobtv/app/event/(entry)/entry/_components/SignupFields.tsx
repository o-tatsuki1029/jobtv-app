"use client";

import { useState } from "react";
import { searchSchoolNames } from "@/lib/actions/school-actions";
import SuggestInput from "@/components/common/SuggestInput";
import MultiSelectDropdown from "@/components/common/MultiSelectDropdown";
import { validatePhone, validatePassword, validateKana } from "@/lib/utils/signup-validation";
import { PREFECTURE_REGIONS } from "@/constants/prefectures";
import {
  GENDERS,
  SCHOOL_TYPES,
  SCHOOL_TYPE_DEFAULT,
  MAJOR_CATEGORIES,
  getGraduationYears,
  getGraduationYearDefault,
  getGraduationYearLabel,
  DESIRED_INDUSTRIES,
  DESIRED_JOB_TYPES,
} from "@/constants/signup-options";
import { cn } from "@jobtv-app/shared/utils/cn";
import TurnstileWidget from "@/components/common/TurnstileWidget";
import { Loader2 } from "lucide-react";
import { primaryButtonClass } from "@/constants/navigation";

const inputClass =
  "w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all";
const inputErrorClass = "border-red-500 bg-red-50/50";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const fieldErrorClass = "mt-0.5 text-xs text-red-600";

interface Props {
  loading: boolean;
  error: string | null;
}

export default function SignupFields({ loading, error }: Props) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [schoolType, setSchoolType] = useState(SCHOOL_TYPE_DEFAULT);
  const [schoolName, setSchoolName] = useState("");
  const [schoolKcode, setSchoolKcode] = useState<string | null>(null);

  return (
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
        <span className={labelClass}>希望勤務地<span className="text-xs font-normal text-gray-500 ml-1">複数選択可</span></span>
        <MultiSelectDropdown
          groups={PREFECTURE_REGIONS.map((r) => ({ label: r.region, options: r.prefectures }))}
          selected={selectedLocations}
          onChange={setSelectedLocations}
          placeholder="選択してください"
        />
        {selectedLocations.map((loc) => (
          <input key={loc} type="hidden" name="desired_work_location" value={loc} />
        ))}
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
        <select id="school_type" name="school_type" required className={inputClass} value={schoolType} onChange={(e) => { setSchoolType(e.target.value as typeof schoolType); setSchoolName(""); setSchoolKcode(null); }}>
          {SCHOOL_TYPES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
      </div>

      {/* 学校名 */}
      <div>
        <label htmlFor="school_name" className={labelClass}>学校名</label>
        <SuggestInput
          name="school_name" value={schoolName}
          onChange={(v) => { setSchoolName(v); setSchoolKcode(null); }}
          onSelect={(item) => { setSchoolName(item.value); setSchoolKcode(item.meta?.school_kcode ?? null); }}
          fetchSuggestions={async (q) => { const r = await searchSchoolNames(q, schoolType); return (r.data ?? []).map((d) => ({ label: d.school_name, value: d.school_name, meta: { school_kcode: d.school_kcode } })); }}
          cacheScope={schoolType} placeholder="例：〇〇大学"
        />
        <input type="hidden" name="school_kcode" value={schoolKcode ?? ""} />
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
        <span className={labelClass}>興味のある業界<span className="text-xs font-normal text-gray-500 ml-1">複数選択可</span></span>
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
        <span className={labelClass}>興味のある職種<span className="text-xs font-normal text-gray-500 ml-1">複数選択可</span></span>
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
  );
}
