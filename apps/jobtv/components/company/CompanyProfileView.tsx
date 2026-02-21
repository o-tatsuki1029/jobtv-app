"use client";

import { useState, useEffect } from "react";
import {
  CompanyMainHeader,
  CompanyDescription,
  CompanyShortVideos,
  CompanyVideos,
  CompanyJobs,
  CompanyEvents,
  CompanyBenefits,
  CompanyOverview,
  CompanySidebar,
  CompanyStickyButton,
  CompanySnsIcons,
  CompanyEntryModal
} from "./index";
import type { EntryModalJob } from "./CompanyEntryModal";
import type { CompanyData } from "./types";
import { useMainTheme } from "./CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

export type { CompanyData };

export default function CompanyProfileView({ company }: { company: CompanyData }) {
  const [currentUrl, setCurrentUrl] = useState("");
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const { classes } = useMainTheme();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  const jobsForModal: EntryModalJob[] = (company.jobs || []).map((j: any) => ({
    id: j.id,
    title: j.title,
    location: j.location,
    graduationYear: j.graduationYear,
    coverImage: j.coverImage,
    prefecture: j.prefecture,
    employmentType: j.employmentType
  }));

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      <div className="container mx-auto px-4 pt-6 pb-12 md:pt-10 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム: メインコンテンツ */}
          <div className="lg:col-span-2 space-y-8 md:space-y-12">
            <CompanyMainHeader company={company} onEntryClick={() => setIsEntryModalOpen(true)} />
            <CompanyDescription company={company} />
            {/* SNSアイコン */}
            {company.snsUrls &&
              (company.snsUrls.x || company.snsUrls.instagram || company.snsUrls.tiktok || company.snsUrls.youtube) && (
                <div className={cn("border-b pb-6 md:pb-8", classes.sectionBorder)}>
                  <CompanySnsIcons snsUrls={company.snsUrls} currentPageUrl={currentUrl} />
                </div>
              )}
            <CompanyShortVideos company={company} />
            <CompanyVideos company={company} />
            <CompanyJobs company={company} />
            <CompanyEvents company={company} />
            <CompanyBenefits company={company} />
            <CompanyOverview company={company} />
          </div>

          {/* 右カラム: サイドバー（詳細情報 & アクション） */}
          <CompanySidebar company={company} onEntryClick={() => setIsEntryModalOpen(true)} />
        </div>
      </div>

      {/* 固定エントリーボタン（スクロール時） */}
      <CompanyStickyButton company={company} onEntryClick={() => setIsEntryModalOpen(true)} />

      {/* エントリー用モーダル（求人複数選択） */}
      <CompanyEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        jobs={jobsForModal}
        returnTo={`/company/${company.id}`}
      />
    </div>
  );
}
