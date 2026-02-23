/**
 * ナビゲーション関連の定数定義
 */

// 共通スタイル
export const navLinkClass = "text-white hover:text-red-500 transition-colors font-bold text-sm";
export const primaryButtonClass =
  "px-10 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors font-semibold text-sm shadow-sm hover:shadow-md";
export const secondaryButtonClass =
  "px-5 py-2.5 border border-white/20 hover:bg-white/10 text-white rounded-full transition-colors font-semibold text-sm";

// ナビゲーションアイテム
export const navItems = [
  { label: "就活Shorts", href: "#" },
  { label: "就活ドキュメンタリー", href: "#" },
  { label: "企業説明", href: "#" },
  { label: "採用イベント", href: "#" },
  { label: "初めての方へ", href: "#" }
] as const;

export const mobileNavItems = [
  { label: "就活縦型Shorts", href: "#" },
  { label: "就活ドキュメンタリー", href: "#" },
  { label: "企業説明", href: "#" },
  { label: "採用イベント", href: "#" },
  { label: "初めての方へ", href: "#" },
  { label: "新卒採用を検討中の法人様", href: "/service" }
] as const;
