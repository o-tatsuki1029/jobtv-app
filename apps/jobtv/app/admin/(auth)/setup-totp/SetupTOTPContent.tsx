"use client";

import { useState } from "react";
import { Shield, QrCode, Copy, Check } from "lucide-react";
import { verifyAndActivateTOTP } from "@/lib/actions/admin-totp-actions";

interface SetupTOTPContentProps {
  qrCode?: string;
  secret?: string;
  factorId?: string;
  enrollError?: string | null;
}

export default function SetupTOTPContent({
  qrCode,
  secret,
  factorId,
  enrollError,
}: SetupTOTPContentProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(enrollError ?? null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);
    const result = await verifyAndActivateTOTP(factorId, code);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // 成功時は server action 側で redirect するため、ここには到達しない
  }

  async function handleCopySecret() {
    if (!secret) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            2段階認証の設定
          </h1>
          <p className="text-gray-400">
            Google Authenticator を使って2段階認証を設定してください
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 shadow-2xl space-y-6">
          {enrollError ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {enrollError}
            </div>
          ) : (
            <>
              {/* Step 1: QR Code */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                    1
                  </span>
                  <p className="text-sm font-medium text-gray-300">
                    Google Authenticator でQRコードをスキャン
                  </p>
                </div>
                {qrCode ? (
                  <div className="flex justify-center bg-white rounded-xl p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCode}
                      alt="TOTP QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-48 bg-gray-900/50 rounded-xl">
                    <QrCode className="w-12 h-12 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Step 2: Manual secret */}
              {secret && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                      2
                    </span>
                    <p className="text-sm font-medium text-gray-300">
                      QRコードが読めない場合は手動入力
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3">
                    <code className="flex-1 text-xs text-gray-300 font-mono break-all">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="shrink-0 text-gray-400 hover:text-white transition-colors"
                      title="コピー"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Enter code */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold">
                      3
                    </span>
                    <label
                      htmlFor="code"
                      className="text-sm font-medium text-gray-300"
                    >
                      アプリに表示された6桁のコードを入力
                    </label>
                  </div>
                  <input
                    type="text"
                    id="code"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    autoComplete="one-time-code"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "確認中..." : "2段階認証を有効にする"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            ⚠️ 設定後は毎回ログイン時にコードが必要になります
          </p>
        </div>
      </div>
    </div>
  );
}
