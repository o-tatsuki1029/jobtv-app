"use client";

import type { CompanyData } from "./types";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyBenefitsProps {
  company: CompanyData;
}

export default function CompanyBenefits({ company }: CompanyBenefitsProps) {
  const { classes } = useMainTheme();
  if (!company.benefits || company.benefits.length === 0) return null;

  return (
    <section>
      <h2 className={cn("text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2", classes.textPrimary)}>
        <span className="w-1.5 h-5 md:h-6 bg-red-300 rounded-full" />
        おすすめポイント
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {company.benefits.map((benefit, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center rounded-lg transition-all p-3 md:p-4 min-h-[3rem] md:min-h-[3.5rem]",
              classes.benefitsCardBg,
              classes.benefitsCardBorderHover
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div
                className={cn(
                  "w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center flex-shrink-0",
                  classes.benefitsIconBg,
                  classes.benefitsIconColor
                )}
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className={cn("text-sm md:text-base font-medium", classes.textSecondary)}>{benefit}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
