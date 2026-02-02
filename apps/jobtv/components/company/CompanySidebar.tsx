"use client";

import Image from "next/image";
import CompanySnsIcons from "./CompanySnsIcons";
import type { CompanyData } from "./types";

interface CompanySidebarProps {
  company: CompanyData;
}

export default function CompanySidebar({ company }: CompanySidebarProps) {
  return (
    <div className="bg-gray-800/50 hover:bg-gray-800/60 rounded-lg overflow-hidden shadow-xl lg:sticky lg:top-5 lg:h-fit transition-all">
      {/* カバー画像 */}
      <div className="relative h-24 md:h-32 w-full">
        {company.coverImage ? (
          <Image src={company.coverImage} alt={company.name} fill className="object-cover opacity-80" />
        ) : (
          <div className="w-full h-full bg-gray-800" />
        )}
      </div>

      <div className="p-5 md:p-6 pt-0 -mt-8 md:-mt-10 relative z-10">
        <div className="flex flex-col items-start text-left">
          <div className="relative w-16 h-16 md:w-20 md:h-20 mb-3 md:mb-4">
            <Image
              src={company.logo}
              alt={company.name}
              fill
              className="object-cover rounded-lg border-4 border-gray-800 shadow-xl"
            />
          </div>
          <h1 className="text-lg md:text-xl font-bold mb-1">{company.name}</h1>
          <p className="text-gray-400 text-xs md:text-sm mb-5 md:mb-6">{company.industry}</p>

          <div className="w-full space-y-3">
            <button className="w-full py-3.5 md:py-4 bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-md font-bold text-base md:text-lg transition-all transform active:scale-[0.9] cursor-pointer">
              エントリーする
            </button>
          </div>
        </div>

        <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-700 space-y-4">
          <h3 className="text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-wider">企業詳細情報</h3>
          <dl className="space-y-3 md:space-y-4">
            {[
              {
                label: "従業員数",
                value: company.employees,
                icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              },
              {
                label: "所在地",
                value: company.location,
                icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              },
              {
                label: "設立",
                value: company.established,
                icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <svg
                  className="w-4 h-4 md:w-5 md:h-5 text-gray-500 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <div>
                  <dt className="text-[10px] md:text-xs text-gray-500">{item.label}</dt>
                  <dd className="text-xs md:text-sm font-medium text-gray-200">{item.value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* SNSアイコン */}
        {company.snsUrls &&
          (company.snsUrls.x || company.snsUrls.instagram || company.snsUrls.tiktok || company.snsUrls.youtube) && (
            <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-gray-700">
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
