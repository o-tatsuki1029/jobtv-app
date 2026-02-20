"use client";

import { useState } from "react";
import { signIn } from "@/lib/actions/auth-actions";
import { primaryButtonClass } from "@/constants/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signIn(formData);

    // signInアクション内でredirectされるため、エラー時のみここが実行される
    if (result && result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center px-4 py-20 bg-white">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ログイン</h1>
          <p className="text-gray-600">JOBTVアカウントでログインしてください</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xl">
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="example@jobtv.jp"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-red-500 hover:text-red-400 transition-colors"
                >
                  パスワードを忘れた場合
                </Link>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="パスワードを入力"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                メールアドレスまたはパスワードが正しくありません。
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${primaryButtonClass} py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "ログイン中..." : "ログイン"}
            </button>
          </form>
        </div>

        <div className="mt-8 space-y-4">
          <p className="text-center text-gray-600 text-sm">
            アカウントをお持ちではありませんか？{" "}
            <Link href="/auth/signup" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
              無料で登録
            </Link>
          </p>
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-center text-gray-500 text-xs mb-2">
              管理者の方はこちら
            </p>
            <Link 
              href="/admin/login" 
              className="block text-center text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
            >
              管理者ログイン →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
