"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { User, Building, Users, HelpCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLoginPathByRole } from "@/lib/auth/redirect";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const tabs = [
    { name: "ユーザー設定", icon: User, href: "/studio/settings/user" },
    { name: "メンバー管理", icon: Users, href: "/studio/settings/members" },
    { name: "企業プロフィール", icon: Building, href: "/studio/settings/profile" },
    { name: "ヘルプ・サポート", icon: HelpCircle, href: "/studio/settings/help" }
  ];

  const handleLogout = async () => {
    if (isLoggingOut) return;

    if (!confirm("ログアウトしますか？")) return;

    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        alert("ログアウトに失敗しました");
        setIsLoggingOut(false);
        return;
      }
      const loginPath = getLoginPathByRole("recruiter");
      // #region agent log
      fetch('http://127.0.0.1:7557/ingest/64046041-1a00-4e5c-9b0e-704b7b8897ef',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'807a72'},body:JSON.stringify({sessionId:'807a72',location:'studio/settings/layout.tsx:logout',message:'redirect after logout',data:{loginPath,method:'window.location'},hypothesisId:'A',timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      window.location.href = loginPath;
    } catch (error) {
      console.error("Logout error:", error);
      alert("ログアウトに失敗しました");
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">設定</h1>
        <p className="text-gray-500 font-medium">企業プロフィールやアカウントの設定を管理します。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* サイドナビ */}
        <div className="lg:col-span-1 space-y-1">
          {tabs.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all ${
                pathname === item.href
                  ? "bg-black text-white shadow-lg shadow-black/5"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </button>
          ))}

          {/* ログアウトボタン */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? "ログアウト中..." : "ログアウト"}
            </button>
          </div>
        </div>

        {/* フォーム */}
        <div className="lg:col-span-3 space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
          {children}
        </div>
      </div>
    </div>
  );
}

