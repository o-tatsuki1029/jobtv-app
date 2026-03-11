"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLoginPathByRole } from "@/lib/auth/redirect";

interface CandidateMenuProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const menuItems = [
  { label: "マイページ", href: "/mypage" },
  { label: "イベント予約一覧", href: "/mypage/reservations" },
  { label: "エントリー中の企業", href: "/mypage/entries" },
  { label: "よくある質問", href: "/mypage/faq" }
];

export default function CandidateMenu({ isOpen, onClose, userName }: CandidateMenuProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    onClose();
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        setIsLoggingOut(false);
        return;
      }
      const loginPath = getLoginPathByRole("candidate");
      window.location.href = loginPath;
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      <div
        className={`fixed top-0 right-0 h-full w-[320px] bg-black border-l border-gray-900 z-[70] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="メニュー"
      >
        <div className="flex flex-col h-full">
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

          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="mb-6 space-y-1.5">
              <p className="text-white font-semibold text-base leading-tight break-words">{userName}</p>
            </div>

            <div className="flex flex-col gap-0 mb-6">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="py-3.5 px-3 text-white hover:text-red-500 hover:bg-gray-950 text-base font-bold rounded-lg transition-colors flex items-center"
                  onClick={onClose}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-900">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-3 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-gray-950 transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? "ログアウト中..." : "ログアウト"}
              </button>
            </div>
          </nav>

          <div className="p-6 border-t border-gray-900">
            <p className="text-gray-600 text-xs text-center">© {new Date().getFullYear()} JOBTV</p>
          </div>
        </div>
      </div>
    </>
  );
}
