"use client";

import { useState } from "react";
import Link from "next/link";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface FaqItem {
  question: string;
  answer: string;
}

export default function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { classes } = useMainTheme();

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/mypage" className={cn("transition-colors hover:opacity-80", classes.textMuted)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">よくある質問</h1>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className={cn("rounded-xl overflow-hidden border", classes.sectionBorder)}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className={cn("w-full flex items-center justify-between px-5 py-4 text-left transition-colors", classes.descriptionCardBg, classes.descriptionCardHover)}
              >
                <span className={cn("font-medium text-sm pr-4", classes.textPrimary)}>{faq.question}</span>
                <svg
                  className={cn("w-5 h-5 shrink-0 transition-transform", classes.textMuted, openIndex === i ? "rotate-180" : "")}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === i && (
                <div className={cn("px-5 pb-4 text-sm leading-relaxed border-t pt-3", classes.descriptionCardBg, classes.sectionBorder, classes.textSecondary)}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
