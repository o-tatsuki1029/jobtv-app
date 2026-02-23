"use client";

import type { CompanyData } from "./types";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyOverviewProps {
  company: CompanyData;
}

export default function CompanyOverview({ company }: CompanyOverviewProps) {
  const { classes } = useMainTheme();

  // 住所を結合（prefecture + addressLine1 + addressLine2）
  const fullAddress = [
    company.prefecture,
    company.addressLine1,
    company.addressLine2
  ].filter(Boolean).join(" ");

  // 会社概要は基本的な情報＋企業情報テキスト。最低限の情報があれば表示
  const hasOverviewData =
    company.name ||
    company.representative ||
    company.established ||
    fullAddress ||
    company.employees ||
    company.industry ||
    company.website ||
    company.companyInfo;

  if (!hasOverviewData) return null;

  return (
    <section>
      <h2 className={cn("text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2", classes.textPrimary)}>
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        会社概要
      </h2>
      <div className={cn("rounded-lg overflow-hidden max-w-3xl px-4", classes.overviewCardBg)}>
        <dl className={classes.overviewDivide}>
          {[
            { label: "会社名", value: company.name },
            { label: "代表者名", value: company.representative },
            { label: "設立年月", value: company.established },
            { label: "本社所在地", value: fullAddress },
            { label: "従業員数", value: company.employees },
            { label: "業界区分", value: company.industry },
            ...(company.companyInfo
              ? [{ label: "企業情報", value: company.companyInfo, isMultiline: true as const }]
              : []),
            {
              label: "公式サイト",
              value: company.website,
              isLink: true
            }
          ]
            .filter((item) => item.value) // 値がある項目のみ表示
            .map((item, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row p-4 md:p-6 gap-1 md:gap-6">
              <dt className={cn("sm:w-32 flex-shrink-0 text-xs md:text-sm font-medium", classes.overviewLabel)}>{item.label}</dt>
              <dd className={cn("text-sm md:text-base", classes.overviewValue)}>
                {item.isLink ? (
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("hover:underline flex items-center gap-1", classes.linkColor)}
                  >
                    {item.value}
                    <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                ) : item.isMultiline && item.value ? (
                  <div className="whitespace-pre-line">{item.value}</div>
                ) : (
                  item.value || ""
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
