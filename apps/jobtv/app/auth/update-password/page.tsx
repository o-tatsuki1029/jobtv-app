"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { updatePassword } from "@/lib/actions/auth-actions";
import { primaryButtonClass } from "@/constants/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function UpdatePasswordPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(true);

  useEffect(() => {
    // URLパラメータから初期パスワード設定かどうかを判定
    const type = searchParams.get("type");
    const tokenHash = searchParams.get("token_hash");
    setIsInitialSetup(type === "invite" || type === "recovery");

    if (tokenHash && (type === "recovery" || type === "invite")) {
      // PKCE フロー: token_hash がクエリパラメータにある場合
      const supabase = createClient();
      supabase.auth
        .verifyOtp({ token_hash: tokenHash, type: type as "recovery" | "invite" })
        .then(({ error: verifyError }) => {
          if (verifyError) {
            let errorMessage = "リンクが無効または期限切れです。新しいパスワードリセットメールを送信してください。";
            if (verifyError.message?.toLowerCase().includes("expired")) {
              errorMessage = "リンクの有効期限が切れています。新しいパスワードリセットメールを送信してください。";
            }
            setError(errorMessage);
            setIsProcessingToken(false);
          } else {
            // セキュリティのため token_hash を URL から削除
            window.history.replaceState(null, "", `${window.location.pathname}?type=${type}`);
            setIsProcessingToken(false);
            router.refresh();
          }
        });
      return;
    }

    // ハッシュフラグメントからトークンまたはエラーを処理
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const errorCode = hashParams.get("error_code");
      const errorDescription = hashParams.get("error_description");

      if (errorCode) {
        // エラーを処理
        let errorMessage = "エラーが発生しました";
        if (errorCode === "otp_expired") {
          errorMessage = "リンクの有効期限が切れています。新しいパスワードリセットメールを送信してください。";
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription);
        }
        setError(errorMessage);
        setIsProcessingToken(false);

        // ハッシュフラグメントをクリア
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else if (accessToken && refreshToken) {
        // トークンでセッションを設定
        const supabase = createClient();
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          .then(({ error: sessionError }) => {
            if (sessionError) {
              console.error("Set session error:", sessionError);
              setError("セッションの設定に失敗しました");
              setIsProcessingToken(false);
            } else {
              // セッション設定成功後、ハッシュフラグメントをクリアしてページをリロード
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
              setIsProcessingToken(false);
              // ページをリロードしてセッションを反映
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
    const result = await updatePassword(formData);
    setLoading(false);

    if (result && result.error) {
      setError(result.error);
    } else if (result && result.success) {
      setSuccess(true);
    }
  }

  if (isProcessingToken) {
    return (
      <div className="flex items-center justify-center px-4 py-20 bg-white">
        <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 text-center max-sm:border-0 max-sm:rounded-none">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">認証を処理しています...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center px-4 py-20 bg-white">
        <div className="max-w-md w-full bg-white p-8 rounded-xl border border-gray-200 text-center max-sm:border-0 max-sm:rounded-none">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isInitialSetup ? "パスワードを設定しました" : "パスワードを更新しました"}
          </h1>
          <p className="text-gray-600 mb-8">新しいパスワードでログインしてください。</p>
          <Link href="/auth/login" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
            ログイン画面へ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-20 bg-white">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isInitialSetup ? "初期パスワードの設定" : "パスワードの更新"}
          </h1>
          <p className="text-gray-600">
            {isInitialSetup
              ? "アカウントを使用するために、初期パスワードを設定してください"
              : "新しいパスワードを設定してください"}
          </p>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-200 max-sm:border-0 max-sm:rounded-none max-sm:px-4">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {isInitialSetup ? "パスワード" : "新しいパスワード"}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                minLength={8}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                placeholder="8文字以上で入力"
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

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-0 px-4 py-6 bg-white"><div className="animate-pulse text-gray-400">読み込み中...</div></div>}>
      <UpdatePasswordPageContent />
    </Suspense>
  );
}
