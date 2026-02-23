"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { CompanyData } from "./types";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyStickyButtonProps {
  company: CompanyData;
  /** エントリーするボタン押下時のコールバック（モーダルを開く等） */
  onEntryClick?: () => void;
}

export default function CompanyStickyButton({ company, onEntryClick }: CompanyStickyButtonProps) {
  const [showStickyButton, setShowStickyButton] = useState(false);
  const { classes } = useMainTheme();

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
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out lg:hidden ${
        showStickyButton ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className={cn("shadow-lg", classes.stickyBarBg, classes.stickyBarBorder)}>
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-white rounded border border-gray-200">
                <Image src={company.logo} alt={company.name} fill className="object-contain rounded p-1" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={cn("text-sm md:text-base font-bold truncate", classes.textPrimary)}>{company.name}</h3>
                <p className={cn("text-xs md:text-sm truncate", classes.textMuted)}>{company.industry}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onEntryClick}
              className="flex-shrink-0 px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-md font-bold text-sm md:text-base transition-colors duration-150 active:opacity-90 cursor-pointer whitespace-nowrap"
            >
              エントリーする
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
