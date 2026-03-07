"use client";

import Link from "next/link";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface MypageTopViewProps {
  fullName: string;
  graduationYear: number | null;
  applicationCount: number;
  reservationCount: number;
  lineLinked: boolean;
}

const CARDS = [
  {
    href: "/mypage/profile",
    title: "プロフィール編集",
    description: "氏名・学校・志望情報を編集できます",
    badgeKey: null as null | "applicationCount" | "reservationCount",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  {
    href: "/mypage/entries",
    title: "エントリー中の企業",
    description: "エントリー済みの求人一覧を確認できます",
    badgeKey: "applicationCount" as const,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    href: "/mypage/reservations",
    title: "説明会・インターン予約一覧",
    description: "説明会の予約状況を確認できます",
    badgeKey: "reservationCount" as const,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    href: "/mypage/faq",
    title: "よくある質問",
    description: "JOBTVの使い方に関するFAQです",
    badgeKey: null as null | "applicationCount" | "reservationCount",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

export default function MypageTopView({ fullName, graduationYear, applicationCount, reservationCount, lineLinked }: MypageTopViewProps) {
  const { classes } = useMainTheme();

  const badges: Record<string, number> = { applicationCount, reservationCount };

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">マイページ</h1>
          {fullName && (
            <p className={cn("text-sm", classes.textMuted)}>
              {fullName}
              {graduationYear ? `（${graduationYear}年卒）` : ""}
            </p>
          )}
        </div>

        {lineLinked ? (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">LINE連携済み</span>
          </div>
        ) : (
          <a
            href="/api/line/authorize"
            className="mb-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#06C755] hover:bg-[#05b04c] text-white font-semibold transition-colors"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
            </svg>
            LINEと連携する
          </a>
        )}

        <div className="grid gap-4">
          {CARDS.map((card) => {
            const badge = card.badgeKey ? badges[card.badgeKey] : null;
            return (
              <Link
                key={card.href}
                href={card.href}
                className={cn(
                  "flex items-center gap-4 p-5 rounded-xl transition-colors",
                  classes.descriptionCardBg,
                  classes.descriptionCardBorder,
                  classes.descriptionCardHover
                )}
              >
                <div className="text-red-500 shrink-0">{card.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-semibold", classes.textPrimary)}>{card.title}</span>
                    {badge != null && badge > 0 && (
                      <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className={cn("text-sm mt-0.5", classes.textMuted)}>{card.description}</p>
                </div>
                <svg className={cn("w-5 h-5 shrink-0", classes.textMuted)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
