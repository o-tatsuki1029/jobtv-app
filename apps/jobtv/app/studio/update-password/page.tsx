"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { recruiterUpdatePassword } from "@/lib/actions/recruiter-auth-actions";
import { createClient } from "@/lib/supabase/client";
import { Building2 } from "lucide-react";
import Link from "next/link";

function StudioUpdatePasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(true);

  useEffect(() => {
    const type = searchParams.get("type");
    setIsInitialSetup(type === "invite" || type === "recovery");

    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const errorCode = hashParams.get("error_code");
      const errorDescription = hashParams.get("error_description");

      if (errorCode) {
        let errorMessage = "エラーが発生しました";
        if (errorCode === "otp_expired") {
          errorMessage = "リンクの有効期限が切れています。新しいパスワードリセットメールを送信してください。";
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription);
        }
        setError(errorMessage);
        setIsProcessingToken(false);
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else if (accessToken && refreshToken) {
        const supabase = createClient();
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(({ error: sessionError }) => {
            if (sessionError) {
              console.error("Set session error:", sessionError);
              setError("セッションの設定に失敗しました");
              setIsProcessingToken(false);
            } else {
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
              setIsProcessingToken(false);
              router.refresh();
            }
          });
      } else {
        setIsProcessingToken(false);
      }
    } else {
      setIsProcessingToken(false);
    }
  }, [searchParams, router]);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await recruiterUpdatePassword(formData);
    setLoading(false);

    if (result && result.error) {
      setError(result.error);
    } else if (result && result.success) {
      setSuccess(true);
    }
  }

  if (isProcessingToken) {
    return (
      <div className="h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 shadow-2xl text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-400">認証を処理しています...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 shadow-2xl text-center">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            {isInitialSetup ? "パスワードを設定しました" : "パスワードを更新しました"}
          </h1>
          <p className="text-gray-400 mb-8">新しいパスワードでログインしてください。</p>
          <Link href="/studio/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
            ログイン画面へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center px-4 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4 shadow-lg">
            <Building2 className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {isInitialSetup ? "初期パスワードの設定" : "パスワードの更新"}
          </h1>
          <p className="text-sm text-gray-400">
            {isInitialSetup
              ? "アカウントを使用するために、初期パスワードを設定してください"
              : "新しいパスワードを設定してください"}
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-gray-700 shadow-2xl">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                {isInitialSetup ? "パスワード" : "新しいパスワード"}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                placeholder="8文字以上で入力"
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
              {loading
                ? isInitialSetup
                  ? "設定中..."
                  : "更新中..."
                : isInitialSetup
                  ? "パスワードを設定"
                  : "パスワードを更新"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function StudioUpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          <div className="animate-pulse text-gray-500">読み込み中...</div>
        </div>
      }
    >
      <StudioUpdatePasswordContent />
    </Suspense>
  );
}
