"use client";

import { useState, useEffect } from "react";
import { primaryButtonClass } from "@/constants/navigation";
import { checkCandidateExists } from "@/lib/actions/session-entry-actions";
import { validateKatakana } from "@jobtv-app/shared/utils/validation";

export interface EventEntryFormData {
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  phone: string;
  email: string;
  school_name: string;
  gender: string;
  graduation_year: string;
}

interface EventEntryFormProps {
  formData: EventEntryFormData;
  setFormData: React.Dispatch<React.SetStateAction<EventEntryFormData>>;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  selectedEventId: string;
}

export function EventEntryForm({
  formData,
  setFormData,
  onChange,
  onSubmit,
  loading,
  error,
  setError,
  selectedEventId
}: EventEntryFormProps) {
  const [step, setStep] = useState<"email" | "details">("email");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [lastNameKanaError, setLastNameKanaError] = useState<string | null>(null);
  const [firstNameKanaError, setFirstNameKanaError] = useState<string | null>(null);

  // カタカナバリデーション
  // カタカナバリデーション
  useEffect(() => {
    setLastNameKanaError(validateKatakana(formData.last_name_kana, "姓（カナ）"));
  }, [formData.last_name_kana]);

  useEffect(() => {
    setFirstNameKanaError(validateKatakana(formData.first_name_kana, "名（カナ）"));
  }, [formData.first_name_kana]);

  // ボタンの有効/無効を判定
  const hasKanaError = lastNameKanaError !== null || firstNameKanaError !== null;

  const handleNext = async () => {
    if (!formData.email) {
      setError("メールアドレスを入力してください");
      return;
    }

    setCheckingEmail(true);
    setError(null);

    try {
      const candidate = await checkCandidateExists(formData.email);
      if (candidate) {
        // 既存ユーザーの場合
        setIsExistingUser(true);
        setFormData({
          ...formData,
          last_name: candidate.last_name || "",
          first_name: candidate.first_name || "",
          last_name_kana: candidate.last_name_kana || "",
          first_name_kana: candidate.first_name_kana || "",
          phone: candidate.phone || "",
          school_name: candidate.school_name || "",
          gender: candidate.gender || "",
          graduation_year: candidate.graduation_year?.toString() || ""
        });
      } else {
        // 新規ユーザーの場合
        setIsExistingUser(false);
      }
      setStep("details");
    } catch (err) {
      setError("エラーが発生しました。もう一度お試しください。");
    } finally {
      setCheckingEmail(false);
    }
  };

  if (step === "email") {
    return (
      <div className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={onChange}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            placeholder="example@jobtv.jp"
          />
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">{error}</div>}

        <button
          type="button"
          onClick={handleNext}
          disabled={checkingEmail || !selectedEventId}
          className={`w-full ${primaryButtonClass} py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {checkingEmail ? "確認中..." : "次へ"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">メールアドレス</p>
            <p className="font-medium text-gray-900">{formData.email}</p>
          </div>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-xs text-red-500 hover:text-red-400 font-medium"
          >
            変更
          </button>
        </div>
      </div>

      {!isExistingUser ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                姓 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                required
                value={formData.last_name}
                onChange={onChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="山田"
              />
            </div>

            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                required
                value={formData.first_name}
                onChange={onChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="太郎"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="last_name_kana" className="block text-sm font-medium text-gray-700 mb-2">
                姓（カナ） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="last_name_kana"
                name="last_name_kana"
                required
                value={formData.last_name_kana}
                onChange={onChange}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all ${
                  lastNameKanaError ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="ヤマダ"
              />
              {lastNameKanaError && <p className="text-[10px] text-red-500 font-bold mt-1">{lastNameKanaError}</p>}
            </div>

            <div>
              <label htmlFor="first_name_kana" className="block text-sm font-medium text-gray-700 mb-2">
                名（カナ） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="first_name_kana"
                name="first_name_kana"
                required
                value={formData.first_name_kana}
                onChange={onChange}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all ${
                  firstNameKanaError ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="タロウ"
              />
              {firstNameKanaError && <p className="text-[10px] text-red-500 font-bold mt-1">{firstNameKanaError}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              value={formData.phone}
              onChange={onChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
              placeholder="090-1234-5678"
            />
          </div>

          <div>
            <label htmlFor="school_name" className="block text-sm font-medium text-gray-700 mb-2">
              学校名
            </label>
            <input
              type="text"
              id="school_name"
              name="school_name"
              value={formData.school_name}
              onChange={onChange}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
              placeholder="〇〇大学"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                性別
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={onChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
              >
                <option value="">選択してください</option>
                <option value="male">男性</option>
                <option value="female">女性</option>
                <option value="other">その他</option>
                <option value="prefer_not_to_say">回答しない</option>
              </select>
            </div>

            <div>
              <label htmlFor="graduation_year" className="block text-sm font-medium text-gray-700 mb-2">
                卒業予定年
              </label>
              <input
                type="number"
                id="graduation_year"
                name="graduation_year"
                value={formData.graduation_year}
                onChange={onChange}
                min="2025"
                max="2030"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="2027"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="py-2">
          <p className="text-sm text-gray-600">ご登録済みのユーザー情報を使用して予約を確定します。</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center leading-relaxed mb-4">
          「申し込みを確定する」をクリックすることで、当社の
          <a href="#" className="text-gray-900 hover:underline">
            {" "}
            利用規約{" "}
          </a>
          および
          <a href="#" className="text-gray-900 hover:underline">
            {" "}
            プライバシーポリシー{" "}
          </a>
          に同意したものとみなされます。
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm mb-4">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedEventId || hasKanaError}
          className={`w-full ${primaryButtonClass} py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? "送信中..." : "申し込みを確定する"}
        </button>
      </div>
    </form>
  );
}
