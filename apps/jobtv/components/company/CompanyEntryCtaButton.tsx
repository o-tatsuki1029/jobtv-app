"use client";

import Link from "next/link";
import { cn } from "@jobtv-app/shared/utils/cn";

/** 企業ページの「エントリーする」と同一のスタイル（色・トランジション）。active:scale は使わない。 */
const ENTRY_CTA_CLASS =
  "bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-md font-bold transition-colors duration-150 active:opacity-90 cursor-pointer inline-flex items-center justify-center";

interface CompanyEntryCtaButtonProps {
  children: React.ReactNode;
  /** ボタンとして使う場合 */
  onClick?: () => void;
  /** リンクとして使う場合（指定時は Link をレンダー） */
  href?: string;
  className?: string;
}

/**
 * エントリー／予約 CTA ボタン。企業ページの「エントリーする」と同一の見た目・挙動。
 * 求人詳細・説明会詳細のエントリー/予約ボタンでも利用する。padding・サイズは className で指定。
 */
export default function CompanyEntryCtaButton({
  children,
  onClick,
  href,
  className
}: CompanyEntryCtaButtonProps) {
  const baseClass = cn(ENTRY_CTA_CLASS, className);

  if (href != null) {
    return <Link href={href} className={baseClass}>{children}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {children}
    </button>
  );
}
