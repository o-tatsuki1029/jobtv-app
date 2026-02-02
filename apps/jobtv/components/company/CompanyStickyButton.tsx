"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { CompanyData } from "./types";

interface CompanyStickyButtonProps {
  company: CompanyData;
}

export default function CompanyStickyButton({ company }: CompanyStickyButtonProps) {
  const [showStickyButton, setShowStickyButton] = useState(false);

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
      <div className="bg-gray-800/30 backdrop-blur-sm border-t border-gray-800 shadow-lg">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
              <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                <Image src={company.logo} alt={company.name} fill className="object-contain rounded" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-base font-bold text-white truncate">{company.name}</h3>
                <p className="text-xs md:text-sm text-gray-400 truncate">{company.industry}</p>
              </div>
            </div>
            <button className="flex-shrink-0 px-6 py-3 md:px-8 md:py-3.5 bg-gradient-to-br from-red-600 to-pink-800 hover:from-red-500 hover:to-pink-700 text-white rounded-md font-bold text-sm md:text-base transition-all transform active:scale-[0.9] cursor-pointer whitespace-nowrap">
              エントリーする
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
