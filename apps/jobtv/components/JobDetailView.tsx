"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Briefcase, Clock, ChevronRight, Calendar, Users } from "lucide-react";
import {
  STICKY_SIDEBAR_TOP_WITH_HEADER_CLASS,
  STICKY_SIDEBAR_TOP_WITHOUT_HEADER_CLASS
} from "@/constants/header-layout";
import { useMainTheme } from "@/components/company/CompanyPageThemeContext";
import CompanyDetailsBlock from "@/components/company/CompanyDetailsBlock";
import CompanyEntryCtaButton from "@/components/company/CompanyEntryCtaButton";
import CompanyEntryModal from "@/components/company/CompanyEntryModal";
import type { EntryModalJob } from "@/components/company/CompanyEntryModal";
import { cn } from "@jobtv-app/shared/utils/cn";

export interface JobData {
  id: string;
  title: string;
  graduationYear?: string;
  location: string;
  status: "published" | "private";
  description: string;
  workLocation?: string;
  workConditions?: string;
  requirements: string;
  benefits: string;
  selectionProcess: string;
  companyName: string;
  companyLogo: string;
  coverImage?: string;
  prefecture?: string;
  locationDetail?: string;
  companyId?: string;
  companyIndustry?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyPrefecture?: string;
  companyEstablished?: string;
  companyEmployees?: string;
  companyBenefits?: string[];
}

export default function JobDetailView({ job }: { job: JobData }) {
  const [showStickyButton, setShowStickyButton] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const { classes, hasHeader, theme } = useMainTheme();

  const jobsForModal: EntryModalJob[] = [
    {
      id: job.id,
      title: job.title,
      location: job.location || undefined,
      graduationYear: job.graduationYear,
      coverImage: job.coverImage,
      prefecture: job.prefecture,
      employmentType: job.workConditions
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const threshold = 100; // 最下部から100px以内を「最下部」と判定

      // 300px以上スクロールしていて、かつ最下部に到達していない場合のみ表示
      const isScrolled = scrollY > 300;
      const isAtBottom = scrollY + windowHeight >= documentHeight - threshold;

      setShowStickyButton(isScrolled && !isAtBottom);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      {/* ヒーローセクション */}
      <section
        className={cn("relative py-12 md:py-20 overflow-hidden", classes.heroSectionBg, classes.heroSectionBorder)}
      >
        {job.coverImage && (
          <>
            <div className="absolute inset-0 z-0">
              <Image src={job.coverImage} alt={job.title} fill className="object-cover" priority />
            </div>
            <div className={cn("absolute inset-0 z-0", theme === "light" ? "bg-black/40" : "bg-black/60")} />
          </>
        )}
        <div className={cn("container mx-auto px-4 relative z-10", job.coverImage && "text-white")}>
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <span className="px-2.5 py-1 bg-red-600/80 text-white text-xs md:text-sm font-bold rounded border border-red-600">
                {job.graduationYear || "2028年卒"}
              </span>
            </div>
            <h1
              className={cn(
                "text-2xl md:text-4xl font-black leading-tight bg-black/40 backdrop-blur-sm px-4 py-3 rounded-lg inline-block",
                job.coverImage ? "text-white" : classes.textPrimary
              )}
            >
              {job.title}
            </h1>
            {(job.workConditions || job.prefecture || job.locationDetail) && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {job.workConditions && (
                  <span className="px-2.5 py-1 bg-blue-600/80 text-white text-xs md:text-sm font-bold rounded border border-blue-600">
                    {job.workConditions}
                  </span>
                )}
                {(job.prefecture || job.locationDetail) && (
                  <span className="px-2.5 py-1 bg-gray-600/80 text-white text-xs md:text-sm font-bold rounded border border-gray-600">
                    {[job.prefecture, job.locationDetail].filter(Boolean).join("/")}
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
            {/* エントリーボタン（SP版のみ） */}
            <section className="lg:hidden">
              <CompanyEntryCtaButton onClick={() => setIsEntryModalOpen(true)} className="w-full py-4 text-base">
                この求人にエントリー
              </CompanyEntryCtaButton>
            </section>

            {/* 勤務条件・勤務地 */}
            {(job.workConditions || job.workLocation || job.graduationYear) && (
              <section className="space-y-6">
                <div className={cn("p-6 md:p-8 rounded-lg", classes.cardBg)}>
                  <div className="flex flex-wrap gap-6">
                    {job.graduationYear && (
                      <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            classes.iconBoxBg,
                            classes.iconBoxBorder
                          )}
                        >
                          <Clock className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className={cn("text-[10px] font-bold uppercase mb-1", classes.textMuted)}>対象卒年度</p>
                          <p className={cn("text-sm md:text-base", classes.textSecondary)}>{job.graduationYear}</p>
                        </div>
                      </div>
                    )}
                    {job.workConditions && (
                      <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            classes.iconBoxBg,
                            classes.iconBoxBorder
                          )}
                        >
                          <Briefcase className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className={cn("text-[10px] font-bold uppercase mb-1", classes.textMuted)}>勤務条件</p>
                          <p className={cn("text-sm md:text-base whitespace-pre-wrap", classes.textSecondary)}>
                            {job.workConditions}
                          </p>
                        </div>
                      </div>
                    )}
                    {job.workLocation && (
                      <div className="flex items-start gap-3 flex-1 min-w-[200px]">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            classes.iconBoxBg,
                            classes.iconBoxBorder
                          )}
                        >
                          <MapPin className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className={cn("text-[10px] font-bold uppercase mb-1", classes.textMuted)}>勤務地</p>
                          <p className={cn("text-sm md:text-base whitespace-pre-wrap", classes.textSecondary)}>
                            {job.workLocation}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* 職務内容 */}
            {job.description && (
              <section className="space-y-6">
                <h2 className={cn("text-xl md:text-2xl font-black flex items-center gap-3", classes.textPrimary)}>
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  職務内容
                </h2>
                <div
                  className={cn(
                    "p-6 md:p-8 rounded-lg leading-relaxed whitespace-pre-wrap",
                    classes.cardBg,
                    classes.textSecondary
                  )}
                >
                  {job.description}
                </div>
              </section>
            )}

            {/* 応募資格 */}
            {job.requirements && (
              <section className="space-y-6">
                <h2 className={cn("text-xl md:text-2xl font-black flex items-center gap-3", classes.textPrimary)}>
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  応募資格
                </h2>
                <div
                  className={cn(
                    "p-6 md:p-8 rounded-lg leading-relaxed whitespace-pre-wrap",
                    classes.cardBg,
                    classes.textSecondary
                  )}
                >
                  {job.requirements}
                </div>
              </section>
            )}

            {/* 福利厚生 */}
            {job.benefits && (
              <section className="space-y-6">
                <h2 className={cn("text-xl md:text-2xl font-black flex items-center gap-3", classes.textPrimary)}>
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  福利厚生
                </h2>
                <div
                  className={cn(
                    "p-6 md:p-8 rounded-lg leading-relaxed whitespace-pre-wrap",
                    classes.cardBg,
                    classes.textSecondary
                  )}
                >
                  {job.benefits}
                </div>
              </section>
            )}

            {/* 選考フロー */}
            {job.selectionProcess && (
              <section className="space-y-6">
                <h2 className={cn("text-xl md:text-2xl font-black flex items-center gap-3", classes.textPrimary)}>
                  <span className="w-1.5 h-6 bg-red-600 rounded-full" />
                  選考フロー
                </h2>
                <div
                  className={cn(
                    "p-6 md:p-8 rounded-lg leading-relaxed whitespace-pre-wrap",
                    classes.cardBg,
                    classes.textSecondary
                  )}
                >
                  {job.selectionProcess}
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
              <h3 className={cn("text-xs font-black uppercase tracking-widest mb-6", classes.textMuted)}>募集企業</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className={cn("relative w-16 h-16 flex-shrink-0 bg-white rounded-md", classes.cardBorder)}>
                  <Image src={job.companyLogo} alt={job.companyName} fill className="object-contain rounded-md" />
                </div>
                <div>
                  <p className={cn("font-black text-lg leading-tight", classes.textPrimary)}>{job.companyName}</p>
                  {job.companyIndustry && (
                    <p className={cn("text-xs mt-1", classes.textMuted)}>{job.companyIndustry}</p>
                  )}
                </div>
              </div>
              <div>
                <CompanyEntryCtaButton onClick={() => setIsEntryModalOpen(true)} className="w-full py-4 text-lg">
                  この求人にエントリー
                </CompanyEntryCtaButton>
              </div>

              {/* 企業情報（本社所在地〜おすすめポイント・企業ページと共通） */}
              <div className="mt-6">
                <CompanyDetailsBlock
                  prefecture={job.companyPrefecture}
                  addressLine1={job.companyAddressLine1}
                  addressLine2={job.companyAddressLine2}
                  established={job.companyEstablished}
                  employees={job.companyEmployees}
                  benefits={job.companyBenefits}
                />
              </div>

              {job.companyId && (
                <div className={cn("mt-6 pt-6 border-t", classes.sectionBorder)}>
                  <Link
                    href={`/company/${job.companyId}`}
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

      {/* 固定エントリーボタン（スクロール時・SP版のみ） */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out lg:hidden ${
          showStickyButton ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className={cn("shadow-lg", classes.stickyBarBg, classes.stickyBarBorder)}>
          <div className="container mx-auto px-4 py-3 md:py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                  <Image src={job.companyLogo} alt={job.companyName} fill className="object-contain rounded" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className={cn("text-sm md:text-base font-bold truncate", classes.textPrimary)}>{job.title}</h3>
                  <p className={cn("text-xs md:text-sm truncate", classes.textMuted)}>{job.companyName}</p>
                </div>
              </div>
              <CompanyEntryCtaButton
                onClick={() => setIsEntryModalOpen(true)}
                className="flex-shrink-0 px-6 py-3 md:px-8 md:py-3.5 text-sm md:text-base whitespace-nowrap"
              >
                この求人にエントリー
              </CompanyEntryCtaButton>
            </div>
          </div>
        </div>
      </div>

      <CompanyEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        jobs={jobsForModal}
        returnTo={job.companyId ? `/job/${job.id}` : undefined}
      />
    </div>
  );
}
