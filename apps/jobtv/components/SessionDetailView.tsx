"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Users, ChevronRight, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { getSessionPastDates } from "@/lib/actions/session-actions";
import {
  STICKY_SIDEBAR_TOP_WITH_HEADER_CLASS,
  STICKY_SIDEBAR_TOP_WITHOUT_HEADER_CLASS
} from "@/constants/header-layout";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import CompanyDetailsBlock from "@/components/company/CompanyDetailsBlock";
import CompanyEntryCtaButton from "@/components/company/CompanyEntryCtaButton";
import CompanyEntryModal from "@/components/company/CompanyEntryModal";
import type { EntryModalSessionDate } from "@/components/company/CompanyEntryModal";
import { cn } from "@jobtv-app/shared/utils/cn";

export interface SessionDate {
  id?: string;
  date: string;
  time: string;
  capacity: number | null;
  /** 過去の日程の場合 true（グレーアウト・実施済み表示） */
  isPast?: boolean;
  /** 受付中・満員・実施済み（満員はグレーアウト） */
  status?: "受付中" | "満員" | "実施済み";
}

export interface SessionData {
  id: string;
  title: string;
  type: string;
  dates: SessionDate[];
  /** 過去の日程がある場合 true（「過去の日程を見る」で取得・表示） */
  hasPastDates?: boolean;
  location: string;
  status: "受付中" | "終了";
  description: string;
  capacity: number | null;
  companyName: string;
  companyLogo: string;
  companyId: string;
  coverImage?: string;
  graduationYear?: number;
  locationType?: string;
  locationDetail?: string;
  companyIndustry?: string;
  companyEmployees?: string;
  companyPrefecture?: string;
  companyEstablished?: string;
  companyRepresentative?: string;
  companyWebsite?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyBenefits?: string[];
}

export default function SessionDetailView({ session }: { session: SessionData }) {
  const [pastDates, setPastDates] = useState<SessionDate[]>([]);
  const [loadingPast, setLoadingPast] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const { classes, hasHeader, theme } = useMainTheme();

  const returnToSession = `/session/${session.id}`;
  const sessionDatesForModal: EntryModalSessionDate[] = (session.dates || [])
    .filter((d): d is SessionDate & { id: string } => !!d.id)
    .map((d) => ({
      id: d.id!,
      date: d.date,
      time: d.time,
      capacity: d.capacity ?? null,
      status: d.status
    }));

  const handleTogglePastDates = async () => {
    if (showPast) {
      setShowPast(false);
      return;
    }
    if (pastDates.length > 0) {
      setShowPast(true);
      return;
    }
    setLoadingPast(true);
    const { data } = await getSessionPastDates(session.id);
    setPastDates((data as SessionDate[]) || []);
    setLoadingPast(false);
    setShowPast(true);
  };

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      {/* ヒーローセクション */}
      <section
        className={cn("relative py-12 md:py-20 overflow-hidden", classes.heroSectionBg, classes.heroSectionBorder)}
      >
        {session.coverImage && (
          <>
            <div className="absolute inset-0 z-0">
              <Image src={session.coverImage} alt={session.title} fill className="object-cover" priority />
            </div>
            <div className={cn("absolute inset-0 z-0", theme === "light" ? "bg-black/40" : "bg-black/60")} />
          </>
        )}
        <div className={cn("container mx-auto px-4 relative z-10", session.coverImage && "text-white")}>
          <div className="max-w-4xl">
            {session.graduationYear && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <span className="px-2.5 py-1 bg-red-600/80 text-white text-xs md:text-sm font-bold rounded border border-red-600">
                  {session.graduationYear}年卒
                </span>
              </div>
            )}
            <h1
              className={cn(
                "text-2xl md:text-4xl font-black leading-tight bg-black/40 backdrop-blur-sm px-4 py-3 rounded-lg inline-block",
                session.coverImage ? "text-white" : classes.textPrimary
              )}
            >
              {session.title}
            </h1>
            {(session.type || session.locationType || session.locationDetail) && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {session.type && (
                  <span className="px-2.5 py-1 bg-blue-600/80 text-white text-xs md:text-sm font-bold rounded border border-blue-600">
                    {session.type}
                  </span>
                )}
                {(session.locationType || session.locationDetail) && (
                  <span className="px-2.5 py-1 bg-gray-600/80 text-white text-xs md:text-sm font-bold rounded border border-gray-600">
                    {[session.locationType, session.locationDetail].filter(Boolean).join("/")}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-12">
            {/* 説明会内容 */}
            <section className="space-y-6">
              <h2 className={cn("text-xl md:text-2xl font-black flex items-center gap-3", classes.textPrimary)}>
                <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                説明会の内容
              </h2>
              <div
                className={cn(
                  "p-6 md:p-8 rounded-lg leading-relaxed whitespace-pre-wrap",
                  classes.cardBg,
                  classes.textSecondary
                )}
              >
                {session.description || "内容が登録されていません。"}
              </div>
            </section>

            {/* 日程一覧（今日以降 or 過去あり） */}
            {(session.dates.length > 0 || session.hasPastDates) && (
              <section className="space-y-6">
                <h2 className={cn("text-xl md:text-2xl font-black flex items-center gap-3", classes.textPrimary)}>
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  開催日程
                </h2>
                {session.dates.length === 0 ? (
                  <div className={cn("p-6 rounded-lg border", classes.cardBg, classes.sectionBorder)}>
                    <p className={cn("font-medium", classes.textMuted)}>現在予約可能な日程がありません。</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {session.dates.map((date, index) => {
                      const isGrayedOut = date.status === "実施済み" || date.status === "満員";
                      return (
                        <div
                          key={index}
                          className={cn(
                            "p-6 rounded-lg border",
                            isGrayedOut ? "opacity-75 " + classes.sectionBorder : classes.cardBorder || "",
                            classes.cardBg
                          )}
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                                  isGrayedOut
                                    ? classes.iconBoxBg + " " + classes.iconBoxBorder
                                    : classes.iconBoxBg + " " + classes.iconBoxBorder
                                )}
                              >
                                <Calendar className={`w-5 h-5 ${isGrayedOut ? "text-gray-500" : "text-red-500"}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p
                                    className={cn(
                                      "font-bold text-lg",
                                      isGrayedOut ? classes.textMuted : classes.textPrimary
                                    )}
                                  >
                                    {date.date}
                                  </p>
                                  {date.status === "実施済み" && (
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 text-xs font-bold rounded",
                                        "bg-gray-600 text-gray-300"
                                      )}
                                    >
                                      実施済み
                                    </span>
                                  )}
                                  {date.status === "満員" && (
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 text-xs font-bold rounded",
                                        "bg-gray-600 text-gray-300"
                                      )}
                                    >
                                      満員
                                    </span>
                                  )}
                                  {date.status === "受付中" && (
                                    <span className="px-2 py-0.5 bg-green-600/80 text-white text-xs font-bold rounded">
                                      受付中
                                    </span>
                                  )}
                                </div>
                                <p className={cn("text-sm mt-1", isGrayedOut ? classes.textMuted : classes.textMuted)}>
                                  {date.time}
                                </p>
                              </div>
                            </div>
                            {date.capacity != null && (
                              <div className={cn("flex items-center gap-2 text-sm", classes.textMuted)}>
                                <Users className="w-4 h-4" />
                                <span>定員: {date.capacity}名</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {session.hasPastDates && (
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleTogglePastDates}
                      disabled={loadingPast}
                      className={cn(
                        "flex items-center gap-2 text-sm font-bold transition-colors disabled:opacity-50",
                        classes.textMuted,
                        "hover:opacity-80"
                      )}
                    >
                      {loadingPast ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : showPast ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {loadingPast ? "読み込み中..." : showPast ? "過去の日程を閉じる" : "過去の日程を見る"}
                    </button>
                    {showPast && pastDates.length > 0 && (
                      <div className="space-y-4 mt-4">
                        {pastDates.map((date, index) => (
                          <div
                            key={index}
                            className={cn("p-6 rounded-lg border opacity-75", classes.cardBg, classes.sectionBorder)}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    classes.iconBoxBg,
                                    classes.iconBoxBorder
                                  )}
                                >
                                  <Calendar className="w-5 h-5 text-gray-500" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={cn("font-bold text-lg", classes.textMuted)}>{date.date}</p>
                                    <span className="px-2 py-0.5 bg-gray-600 text-gray-300 text-xs font-bold rounded">
                                      実施済み
                                    </span>
                                  </div>
                                  <p className={cn("text-sm mt-1", classes.textMuted)}>{date.time}</p>
                                </div>
                              </div>
                              {date.capacity != null && (
                                <div className={cn("flex items-center gap-2 text-sm", classes.textMuted)}>
                                  <Users className="w-4 h-4" />
                                  <span>定員: {date.capacity}名</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* 定員（全体） */}
            {session.capacity && (
              <section className="space-y-6">
                <h2 className={cn("text-xl md:text-2xl font-black flex items-center gap-3", classes.textPrimary)}>
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  定員
                </h2>
                <div
                  className={cn(
                    "p-6 md:p-8 rounded-lg leading-relaxed flex items-center gap-2",
                    classes.cardBg,
                    classes.textSecondary
                  )}
                >
                  <Users className={cn("w-5 h-5", classes.textMuted)} />
                  {session.capacity}名
                </div>
              </section>
            )}
          </div>

          {/* サイドバー */}
          <div
            className={cn(
              "sticky self-start space-y-6",
              hasHeader ? STICKY_SIDEBAR_TOP_WITH_HEADER_CLASS : STICKY_SIDEBAR_TOP_WITHOUT_HEADER_CLASS
            )}
          >
            {/* 企業情報カード */}
            <div className={cn("p-6 rounded-lg shadow-xl", classes.cardBg)}>
              <h3 className={cn("text-xs font-black uppercase tracking-widest mb-6", classes.textMuted)}>主催企業</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("relative w-16 h-16 flex-shrink-0 bg-white rounded-md", classes.cardBorder)}>
                  <Image
                    src={session.companyLogo}
                    alt={session.companyName}
                    fill
                    className="object-contain rounded-md"
                  />
                </div>
                <div>
                  <p className={cn("font-black text-lg leading-tight", classes.textPrimary)}>{session.companyName}</p>
                  {session.companyIndustry && (
                    <p className={cn("text-xs mt-1", classes.textMuted)}>{session.companyIndustry}</p>
                  )}
                </div>
              </div>
              <div>
                <CompanyEntryCtaButton onClick={() => setIsReservationModalOpen(true)} className="w-full py-4 text-lg">
                  参加予約をする
                </CompanyEntryCtaButton>
              </div>

              {/* 企業情報（本社所在地〜おすすめポイント・企業ページと共通） */}
              <div className="mt-6">
                <CompanyDetailsBlock
                  prefecture={session.companyPrefecture}
                  addressLine1={session.companyAddressLine1}
                  addressLine2={session.companyAddressLine2}
                  established={session.companyEstablished}
                  employees={session.companyEmployees}
                  benefits={session.companyBenefits}
                />
              </div>

              {session.companyId && (
                <div className={cn("mt-6 pt-6 border-t", classes.sectionBorder)}>
                  <Link
                    href={`/company/${session.companyId}`}
                    className={cn(
                      "w-full py-3 bg-transparent rounded-md font-bold text-sm transition-all flex items-center justify-center gap-2",
                      classes.cardBorder,
                      classes.textPrimary,
                      "hover:opacity-90"
                    )}
                  >
                    企業詳細を見る
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <CompanyEntryModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        variant="session"
        sessionDates={sessionDatesForModal}
        returnTo={returnToSession}
      />
    </div>
  );
}
