"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_LINE_NAVIGATION } from "../constants";
import StudioNavItem from "../molecules/StudioNavItem";

export default function LineSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* サイドバー（デスクトップ） */}
      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 bg-black text-white z-50">
        <div className="p-6">
          <Link href="/admin/line" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded flex items-center justify-center transition-transform group-hover:scale-110 bg-[#06C755]">
              <span className="text-white font-black text-xl">L</span>
            </div>
            <span className="text-xl font-bold tracking-tighter uppercase">LINE 管理</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {ADMIN_LINE_NAVIGATION.map((item) => (
            <StudioNavItem
              key={item.name}
              name={item.name}
              href={item.href}
              icon={item.icon}
              isActive={pathname === item.href || (item.href !== "/admin/line" && pathname.startsWith(item.href))}
            />
          ))}
        </nav>
      </aside>

      {/* ヘッダー（モバイル） */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-black text-white z-50 border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin/line" className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-[#06C755]">
              <span className="text-white font-black text-sm">L</span>
            </div>
            <span className="text-sm font-bold tracking-tighter uppercase">LINE 管理</span>
          </Link>
        </div>
      </header>
    </>
  );
}
