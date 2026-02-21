"use client";

import { useState } from "react";
import Link from "next/link";
import { recruiterSignIn } from "@/lib/actions/recruiter-auth-actions";
import { Building2 } from "lucide-react";

export default function StudioLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await recruiterSignIn(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
    }
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">企業担当者ログイン</h1>
          <p className="text-sm text-gray-400">企業担当者アカウントでログインしてください</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-gray-700 shadow-2xl">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="recruiter@example.co.jp"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                パスワード
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="パスワードを入力"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "ログイン中..." : "企業担当者としてログイン"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-500 text-sm">求職者の方はこちら</p>
          <Link
            href="/auth/login"
            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors"
          >
            求職者ログイン →
          </Link>
        </div>
      </div>
    </div>
  );
}
