"use client";

import { useState, useEffect } from "react";
import ProgramSection from "@/components/ProgramSection";
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
  CompanySnsIcons
} from "./index";
import type { CompanyData } from "./types";

export type { CompanyData };

export default function CompanyProfileView({ company }: { company: CompanyData }) {
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
    }
  }, []);

  return (
    <div className="min-h-screen text-white">
      <div className="container mx-auto px-4 pt-6 pb-12 md:pt-10 md:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左カラム: メインコンテンツ */}
          <div className="lg:col-span-2 space-y-8 md:space-y-12">
            <CompanyMainHeader company={company} />
            <CompanyDescription company={company} />
            {/* SNSアイコン */}
            {company.snsUrls &&
              (company.snsUrls.x || company.snsUrls.instagram || company.snsUrls.tiktok || company.snsUrls.youtube) && (
                <div className="border-b border-gray-800 pb-6 md:pb-8">
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
          <CompanySidebar company={company} />
        </div>

        {/* 関連動画セクション (全幅) */}
        <div className="mt-12 md:mt-20 pt-8 md:pt-12 border-t border-gray-800">
          <ProgramSection
            title={`${company.name}の他の動画`}
            programs={company.programs}
            vertical={true}
            showMore={false}
          />
        </div>
      </div>

      {/* 固定エントリーボタン（スクロール時） */}
      <CompanyStickyButton company={company} />
    </div>
  );
}
