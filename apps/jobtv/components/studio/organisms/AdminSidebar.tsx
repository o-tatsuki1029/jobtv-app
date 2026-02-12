"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { ADMIN_NAVIGATION } from "../constants";
import StudioNavItem from "../molecules/StudioNavItem";
import { getUserInfo } from "@/lib/actions/user-actions";

export default function AdminSidebar() {
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const result = await getUserInfo();
        if (result.error) {
          console.error("Failed to fetch user info:", result.error);
          setUserName(null);
        } else {
          setUserName(result.userName);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setUserName(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <>
      {/* サイドバー（デスクトップ） */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-black text-white z-50">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center transition-transform group-hover:scale-110">
              <span className="text-black font-black text-xl">A</span>
            </div>
            <span className="text-xl font-bold tracking-tighter uppercase">Admin Panel</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {ADMIN_NAVIGATION.map((item) => (
            <StudioNavItem
              key={item.name}
              name={item.name}
              href={item.href}
              icon={item.icon}
              isActive={pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3">
          {!isLoading && userName && (
            <div className="px-4 py-2 space-y-1">
              <div className="text-xs font-medium text-gray-400">管理者</div>
              <div className="text-sm font-bold text-white">{userName}</div>
            </div>
          )}
          <Link
            href="/studio"
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-400 hover:text-white transition-colors group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            スタジオに戻る
          </Link>
        </div>
      </aside>

      {/* ヘッダー（モバイル） */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-black text-white z-50 border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
              <span className="text-black font-black text-sm">A</span>
            </div>
            <span className="text-sm font-bold tracking-tighter uppercase">Admin</span>
          </Link>
        </div>
      </header>
    </>
  );
}

