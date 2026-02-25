"use client";

import Image from "next/image";
import VideoPlayer from "@/components/VideoPlayer";
import type { CompanyData } from "./types";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_ASPECT_RATIO_16_9_CLASS } from "@/constants/card-layout";

interface CompanyMainHeaderProps {
  company: CompanyData;
  /** エントリーするボタン押下時のコールバック（モーダルを開く等） */
  onEntryClick?: () => void;
}

export default function CompanyMainHeader({ company, onEntryClick }: CompanyMainHeaderProps) {
  const { classes } = useMainTheme();

  return (
    <section className="-mx-4 md:mx-0">
      {company.mainVideo && (
        <div className={cn("overflow-hidden md:rounded-lg shadow-2xl border-y md:border bg-black", classes.headerVideoBorder)}>
          <VideoPlayer
            src={company.mainVideo}
            streamingUrl={company.mainStreamingUrl ?? undefined}
            poster={company.mainVideoPoster || company.coverImage || undefined}
            className={cn("w-full", HORIZONTAL_CARD_ASPECT_RATIO_16_9_CLASS)}
          />
        </div>
      )}
      <div
        className={`${
          company.mainVideo ? "mt-4 md:mt-6" : ""
        } px-4 md:px-0 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6`}
      >
        <div className="flex items-center gap-4 md:gap-5">
          <div className={cn("relative w-12 h-12 md:w-16 md:h-16 flex-shrink-0 bg-white rounded-md overflow-hidden shadow-sm", classes.headerLogoBorder)}>
            {company.logo ? (
              <Image src={company.logo} alt={company.name} fill className="object-contain" />
            ) : (
              <div className={cn("w-full h-full flex items-center justify-center", classes.logoPlaceholderBg)}>
                <span className={cn("font-bold text-lg", classes.logoPlaceholderText)}>{company.name.charAt(0)}</span>
              </div>
            )}
          </div>
          <div>
            <h1 className={cn("text-lg md:text-2xl font-bold mb-0.5", classes.textPrimary)}>{company.name}</h1>
            <p className={cn("text-[10px] md:text-sm font-medium", classes.textMuted)}>{company.industry}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={onEntryClick}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-md font-bold text-base transition-colors duration-150 active:opacity-90 cursor-pointer"
          >
            エントリーする
          </button>
        </div>
      </div>
    </section>
  );
}
