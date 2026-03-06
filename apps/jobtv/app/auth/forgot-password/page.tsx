"use client";

import { useState } from "react";
import { resetPassword } from "@/lib/actions/auth-actions";
import { primaryButtonClass } from "@/constants/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await resetPassword(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="flex items-center justify-center px-4 py-20 bg-white">
        <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 text-center max-sm:border-0 max-sm:rounded-none">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">再設定メールを送信しました</h1>
          <p className="text-gray-600 mb-8">
            パスワード再設定用のリンクをメールで送信しました。メールをご確認ください。
          </p>
          <Link href="/auth/login" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
            ログイン画面に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-20 bg-white">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">パスワードを忘れた場合</h1>
          <p className="text-gray-600">登録済みのメールアドレスを入力してください</p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-4">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="example@jobtv.jp"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${primaryButtonClass} py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  送信中...
                </span>
              ) : "再設定メールを送信"}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-gray-600 text-sm">
          <Link href="/auth/login" className="text-gray-900 hover:text-red-500 transition-colors font-medium">
            ← ログイン画面に戻る
          </Link>
        </p>
      </div>
    </div>
  );
}
