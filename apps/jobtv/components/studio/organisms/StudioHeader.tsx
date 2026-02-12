"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { STUDIO_NAVIGATION } from "../constants";
import StudioNavItem from "../molecules/StudioNavItem";
import { createClient } from "@/lib/supabase/client";

export default function StudioHeader() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    setIsOpen(false);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        alert("ログアウトに失敗しました");
        setIsLoggingOut(false);
        return;
      }
      
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      alert("ログアウトに失敗しました");
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* モバイルヘッダー */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-black text-white flex items-center justify-between px-4 z-50 shadow-lg">
        <Link href="/studio" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
            <span className="text-black font-black text-xl">J</span>
          </div>
          <span className="font-bold">Studio</span>
        </Link>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* モバイルメニューオーバーレイ */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black pt-16 animate-in fade-in slide-in-from-top-4 duration-300">
          <nav className="p-4 space-y-2">
            {STUDIO_NAVIGATION.map((item) => (
              <StudioNavItem
                key={item.name}
                name={item.name}
                href={item.href}
                icon={item.icon}
                isActive={pathname === item.href}
                onClick={() => setIsOpen(false)}
                variant="mobile"
              />
            ))}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-3 w-full px-4 py-4 text-gray-400 font-medium border-t border-white/10 mt-4 transition-colors hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut className="w-6 h-6" />
              {isLoggingOut ? "ログアウト中..." : "ログアウト"}
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
