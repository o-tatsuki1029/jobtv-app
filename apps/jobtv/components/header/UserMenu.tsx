"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import MenuToggleButton from "./MenuToggleButton";
import { createClient } from "@/lib/supabase/client";

interface UserMenuProps {
  userName?: string;
  userAvatar?: string;
}

export default function UserMenu({ userName = "ユーザー", userAvatar }: UserMenuProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { label: "マイページ", href: "#" },
    { label: "イベント予約一覧", href: "#" },
    { label: "エントリー中の企業", href: "#" },
    { label: "よくある質問", href: "#" }
  ];

  // メニュー外をクリックしたら閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className="relative flex items-center gap-3" ref={menuRef}>
      {/* メッセージアイコン */}
      <button className="relative p-2 text-white hover:text-red-500 transition-colors" aria-label="メッセージ">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {/* メッセージバッジ */}
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>
      {/* 通知マーク */}
      <button className="relative p-2 text-white hover:text-red-500 transition-colors" aria-label="通知">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* 通知バッジ */}
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>
      <MenuToggleButton isOpen={isMenuOpen} onClick={() => setIsMenuOpen(!isMenuOpen)} className="" />
      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              {userAvatar ? (
                <Image src={userAvatar} alt={userName} width={32} height={32} className="rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                  {userName.charAt(0)}
                </div>
              )}
              <span className="text-white text-sm font-semibold truncate">{userName}</span>
            </div>
          </div>
          <nav className="flex flex-col">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                }}
              >
                {item.label}
              </a>
            ))}
            <button
              onClick={async () => {
                if (isLoggingOut) return;
                setIsLoggingOut(true);
                setIsMenuOpen(false);
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
              }}
              disabled={isLoggingOut}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors border-t border-gray-700 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? "ログアウト中..." : "ログアウト"}
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
