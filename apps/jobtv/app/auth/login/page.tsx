"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/actions/auth-actions";
import { primaryButtonClass } from "@/constants/navigation";
import Link from "next/link";

function LoginPageContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7557/ingest/64046041-1a00-4e5c-9b0e-704b7b8897ef", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "561a53" },
      body: JSON.stringify({
        sessionId: "561a53",
        location: "login/page.tsx:next",
        message: "Login page next param",
        data: { next, raw: searchParams.toString() },
        timestamp: Date.now(),
        hypothesisId: "B"
      })
    }).catch(() => {});
  }
  // #endregion
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

  const signupHref = next ? `/auth/signup?next=${encodeURIComponent(next)}` : "/auth/signup";

  return (
    <div className="flex-1 flex items-center justify-center min-h-0 px-4 py-6 bg-white">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">ログイン</h1>
          <p className="text-sm text-gray-600">JOBTVアカウントでログインしてください</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-4">
          <form action={handleSubmit} className="space-y-6">
            {next ? <input type="hidden" name="next" value={next} /> : null}
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
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="パスワードを入力"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-600 text-sm">
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

        <div className="mt-6 space-y-3">
          <p className="text-center text-gray-600 text-sm">
            アカウントをお持ちではありませんか？{" "}
            <Link href={signupHref} className="text-red-500 hover:text-red-400 font-semibold transition-colors">
              無料で登録
            </Link>
          </p>
          
          <div className="pt-3 border-t border-gray-200">
            <p className="text-center text-gray-500 text-xs mb-2">
              企業担当者の方はこちら
            </p>
            <Link 
              href="/studio/login" 
              className="block text-center text-blue-600 hover:text-blue-500 text-sm font-medium transition-colors"
            >
              企業担当者さまログイン →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-0 px-4 py-6 bg-white"><div className="animate-pulse text-gray-400">読み込み中...</div></div>}>
      <LoginPageContent />
    </Suspense>
  );
}
