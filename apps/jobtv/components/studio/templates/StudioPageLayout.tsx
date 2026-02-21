"use client";

import React from "react";
import StudioSidebar from "../organisms/StudioSidebar";
import StudioHeader from "../organisms/StudioHeader";
import ProxyLoginBanner from "../organisms/ProxyLoginBanner";

interface StudioPageLayoutProps {
  children: React.ReactNode;
}

export default function StudioPageLayout({ children }: StudioPageLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* サイドバー（デスクトップ） */}
      <StudioSidebar />

      {/* ヘッダー（モバイル） */}
      <StudioHeader />

      {/* 代理ログイン中のバナー */}
      <ProxyLoginBanner />

      {/* メインコンテンツ */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0">
        <div className="p-6 md:p-10 max-w-7xl mx-auto pt-24 md:pt-10">{children}</div>
      </main>
    </div>
  );
}
