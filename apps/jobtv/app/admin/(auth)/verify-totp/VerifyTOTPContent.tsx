"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { verifyAdminTOTP } from "@/lib/actions/admin-totp-actions";

export default function VerifyTOTPContent() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await verifyAdminTOTP(code);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // 成功時は server action 側で redirect するため、ここには到達しない
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            2段階認証
          </h1>
          <p className="text-gray-400">
            Google Authenticator に表示された6桁のコードを入力してください
          </p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                認証コード
              </label>
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
                autoFocus
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
              {loading ? "確認中..." : "確認する"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">⚠️ このページは管理者専用です</p>
        </div>
      </div>
    </div>
  );
}
