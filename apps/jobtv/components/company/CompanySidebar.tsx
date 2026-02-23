"use client";

import Image from "next/image";
import CompanySnsIcons from "./CompanySnsIcons";
import CompanyDetailsBlock from "./CompanyDetailsBlock";
import CompanyEntryCtaButton from "./CompanyEntryCtaButton";
import type { CompanyData } from "./types";
import {
  STICKY_SIDEBAR_TOP_WITH_HEADER_CLASS_LG,
  STICKY_SIDEBAR_TOP_WITHOUT_HEADER_CLASS_LG
} from "@/constants/header-layout";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanySidebarProps {
  company: CompanyData;
  /** エントリーするボタン押下時のコールバック（モーダルを開く等） */
  onEntryClick?: () => void;
}

export default function CompanySidebar({ company, onEntryClick }: CompanySidebarProps) {
  const { classes, hasHeader } = useMainTheme();

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden shadow-sm lg:sticky lg:h-fit transition-all",
        hasHeader ? STICKY_SIDEBAR_TOP_WITH_HEADER_CLASS_LG : STICKY_SIDEBAR_TOP_WITHOUT_HEADER_CLASS_LG,
        classes.cardBg,
        classes.cardBgHover,
        classes.cardBorder,
        classes.cardBorderHover
      )}
    >
      {/* カバー画像 */}
      <div className="relative h-24 md:h-32 w-full">
        {company.coverImage ? (
          <Image src={company.coverImage} alt={company.name} fill className="object-cover opacity-90" />
        ) : (
          <div className={cn("w-full h-full", classes.sidebarCoverPlaceholder)} />
        )}
      </div>

      <div className="p-5 md:p-6 pt-0 -mt-8 md:-mt-10 relative z-10">
        <div className="flex flex-col items-start text-left">
          <div className="relative w-16 h-16 md:w-20 md:h-20 mb-3 md:mb-4 bg-white rounded-lg border-4 border-white shadow-lg overflow-hidden">
            {company.logo ? (
              <Image src={company.logo} alt={company.name} fill className="object-contain" />
            ) : (
              <div className={cn("w-full h-full flex items-center justify-center", classes.logoPlaceholderBg)}>
                <span className={cn("font-bold text-xl", classes.logoPlaceholderText)}>{company.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <h1 className={cn("text-lg md:text-xl font-bold mb-1", classes.textPrimary)}>{company.name}</h1>
          <p className={cn("text-xs md:text-sm mb-5 md:mb-6", classes.textMuted)}>{company.industry}</p>

          <div className="w-full space-y-3">
            <CompanyEntryCtaButton onClick={onEntryClick} className="w-full py-3.5 md:py-4 text-base md:text-lg">
              エントリーする
            </CompanyEntryCtaButton>
          </div>
        </div>

        {(company.addressLine1 ||
          company.addressLine2 ||
          company.prefecture ||
          company.established ||
          company.employees ||
          (company.benefits && company.benefits.length > 0)) && (
          <div className="mt-6 md:mt-8">
            <CompanyDetailsBlock
              prefecture={company.prefecture}
              addressLine1={company.addressLine1}
              addressLine2={company.addressLine2}
              established={company.established}
              employees={company.employees}
              benefits={company.benefits}
            />
          </div>
        )}

        {/* SNSアイコン */}
        {company.snsUrls &&
          (company.snsUrls.x || company.snsUrls.instagram || company.snsUrls.tiktok || company.snsUrls.youtube) && (
            <div className={cn("mt-6 md:mt-8 pt-6 md:pt-8 border-t", classes.sectionBorder)}>
              <CompanySnsIcons
                snsUrls={company.snsUrls}
                currentPageUrl={typeof window !== "undefined" ? window.location.href : undefined}
              />
            </div>
          )}
      </div>
    </div>
  );
}
