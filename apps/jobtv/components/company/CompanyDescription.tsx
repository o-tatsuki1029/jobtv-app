"use client";

import { useState } from "react";
import type { CompanyData } from "./types";

interface CompanyDescriptionProps {
  company: CompanyData;
}

const MAX_DESCRIPTION_LENGTH = 100;

export default function CompanyDescription({ company }: CompanyDescriptionProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // 見出しも本文もない場合は、ボックス全体を非表示
  if (!company.tagline && !company.description) {
    return null;
  }

  const shouldTruncate = company.description.length > MAX_DESCRIPTION_LENGTH;
  const displayDescription =
    shouldTruncate && !isDescriptionExpanded
      ? company.description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."
      : company.description;

  return (
    <section
      className={`bg-gray-800/50 rounded-lg p-5 md:p-8 ${
        shouldTruncate && !isDescriptionExpanded ? "cursor-pointer hover:bg-gray-800/60" : ""
      }`}
      onClick={shouldTruncate && !isDescriptionExpanded ? () => setIsDescriptionExpanded(true) : undefined}
    >
      {/* キャッチコピーがある場合のみ見出しを表示 */}
      {company.tagline && (
        <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
          <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
          {company.tagline}
        </h2>
      )}
      {company.description && (
        <>
          <p className="text-gray-300 leading-relaxed text-base md:text-lg whitespace-pre-wrap">{displayDescription}</p>
          {shouldTruncate && (
            <div
              className="mt-4"
              onClick={(e) => {
                if (isDescriptionExpanded) {
                  e.stopPropagation();
                }
              }}
            >
              <button
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="text-red-500 hover:text-red-400 font-semibold text-sm md:text-base transition-colors flex items-center gap-1.5"
              >
                {isDescriptionExpanded ? (
                  <>
                    閉じる
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    もっと見る
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
