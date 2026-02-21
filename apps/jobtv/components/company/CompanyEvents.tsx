"use client";

import Link from "next/link";
import Image from "next/image";
import type { CompanyData } from "./types";
import { useMainTheme } from "./CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyEventsProps {
  company: CompanyData;
}

export default function CompanyEvents({ company }: CompanyEventsProps) {
  const { classes } = useMainTheme();
  if (!company.events || company.events.length === 0) return null;

  return (
    <section>
      <h2 className={cn("text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2", classes.textPrimary)}>
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        説明会・インターンシップ
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {company.events.map((event) => {
          const coverImage = (event as any).coverImage || company.coverImage;
          return (
            <Link
              key={event.id}
              href={`/session/${event.id}`}
              className={cn(
                "flex flex-col rounded-lg transition-all overflow-hidden group shadow-sm",
                classes.cardBg,
                classes.cardBorder,
                classes.cardBorderHover
              )}
            >
              {coverImage && (
                <div className="relative w-full aspect-[3/1] overflow-hidden">
                  <Image
                    src={coverImage}
                    alt={event.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="flex flex-col flex-1 p-4 md:p-5">
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(event as any).graduationYear && (
                      <span className="px-2 py-0.5 bg-red-600/80 text-white text-xs font-bold rounded border border-red-600">
                        {(event as any).graduationYear}年卒
                      </span>
                    )}
                    {(event as any).locationType && (
                      <span className="px-2 py-0.5 bg-gray-600/80 text-white text-xs font-bold rounded border border-gray-600">
                        {(event as any).locationType}
                      </span>
                    )}
                    {event.type && (
                      <span className="px-2 py-0.5 bg-blue-600/80 text-white text-xs font-bold rounded border border-blue-600 uppercase tracking-wider">
                        {event.type}
                      </span>
                    )}
                  </div>
                  <h3 className={cn("text-base md:text-lg font-bold group-hover:text-red-500 transition-colors line-clamp-2", classes.textPrimary)}>
                    {event.title}
                  </h3>
                </div>
                <div className={cn("space-y-1.5 text-xs md:text-sm", classes.textMuted)}>
                  {event.date && (
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 text-current opacity-80"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="line-clamp-1">{event.date}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 text-current opacity-80"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className={cn("px-5 py-2.5 md:py-3 text-[10px] md:text-xs font-bold text-center group-hover:bg-red-600 group-hover:text-white transition-all", classes.jobCardFooterBg, classes.jobCardFooterBorder, classes.jobCardFooterText)}>
                詳細を見る
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
