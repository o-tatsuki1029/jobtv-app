"use client";

import { mobileNavItems, primaryButtonClass, secondaryButtonClass } from "@/constants/navigation";
import Link from "next/link";
import { useEffect } from "react";

interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  // メニューが開いている時に背面をスクロールさせない
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <>
      {/* 背景オーバーレイ（企業ログイン時と同じスタイル） */}
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* メニュー本体（企業ログイン時と同じスタイル） */}
      <div
        className={`fixed top-0 right-0 h-full w-[320px] bg-black border-l border-gray-900 z-[70] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="メニュー"
      >
        <div className="flex flex-col h-full">
          {/* 閉じるボタン */}
          <div className="p-4 flex justify-end border-b border-gray-900">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white transition-colors rounded-md hover:bg-gray-900/80"
              aria-label="閉じる"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* ナビゲーションリンク */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="flex flex-col gap-0 mb-6">
              {mobileNavItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="py-3.5 px-3 text-white hover:text-red-500 hover:bg-gray-950 text-base font-bold rounded-lg transition-colors"
                  onClick={onClose}
                >
                  {item.label}
                </a>
              ))}
            </div>

            {/* アクションボタン */}
            <div className="space-y-4">
              <Link
                href="/auth/signup"
                className={`w-full ${primaryButtonClass} py-4 text-center block text-base font-bold`}
                onClick={onClose}
              >
                無料登録
              </Link>
              <Link
                href="/auth/login"
                className={`w-full ${secondaryButtonClass} py-4 text-center block text-base font-bold`}
                onClick={onClose}
              >
                ログイン
              </Link>
            </div>
          </nav>

          {/* フッター */}
          <div className="p-6 border-t border-gray-900 mt-auto">
            <p className="text-gray-600 text-xs text-center">© {new Date().getFullYear()} JOBTV</p>
          </div>
        </div>
      </div>
    </>
  );
}
