"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { exitProxyLogin } from "@/lib/actions/proxy-login-actions";
import { useRouter } from "next/navigation";

interface ProxyLoginStatus {
  isProxyLogin: boolean;
  companyId?: string;
  companyName?: string;
  originalAdminId?: string;
}

export default function ProxyLoginBanner() {
  const router = useRouter();
  const [status, setStatus] = useState<ProxyLoginStatus | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/proxy-login-status");
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          
          // タイムアウトした場合は自動的にリダイレクト
          if (!data.isProxyLogin && data.originalAdminId) {
            router.push("/admin");
            return;
          }
        }
      } catch (error) {
        console.error("Check proxy login status error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
    
    // 1分ごとにタイムアウトをチェック
    const interval = setInterval(checkStatus, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [router]);

  const handleExit = async () => {
    if (isExiting) return;

    setIsExiting(true);
    try {
      const result = await exitProxyLogin();
      if (result.error) {
        alert(result.error);
        setIsExiting(false);
      } else if (result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      }
    } catch (error) {
      console.error("Exit proxy login error:", error);
      // NEXT_REDIRECTエラーは正常な動作なので無視
      if (error && typeof error === "object" && "digest" in error && error.digest === "NEXT_REDIRECT") {
        // リダイレクトは既に実行されている
        return;
      }
      alert("代理ログインの終了に失敗しました");
      setIsExiting(false);
    }
  };

  if (isLoading || !status?.isProxyLogin) {
    return null;
  }

  return (
    <div className="fixed top-16 md:top-0 right-0 left-0 md:left-64 z-40 bg-yellow-500 text-white px-4 py-2 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-medium flex-1 min-w-0">
          <span className="bg-yellow-600 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">代理ログイン中</span>
          <span className="truncate">{status.companyName}として操作中</span>
        </div>
        <button
          onClick={handleExit}
          disabled={isExiting}
          className="flex items-center gap-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
        >
          {isExiting ? "終了中..." : "代理ログインを終了"}
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

