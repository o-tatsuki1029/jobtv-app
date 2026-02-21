"use client";

import Link from "next/link";
import Image from "next/image";
import type { CompanyData } from "./types";
import { useMainTheme } from "./CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyJobsProps {
  company: CompanyData;
}

export default function CompanyJobs({ company }: CompanyJobsProps) {
  const { classes } = useMainTheme();
  if (!company.jobs || company.jobs.length === 0) return null;

  return (
    <section>
      <h2 className={cn("text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2", classes.textPrimary)}>
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        募集中の求人
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {company.jobs.map((job) => {
          const coverImage = job.coverImage || company.coverImage;
          return (
            <Link
              key={job.id}
              href={`/job/${job.id}`}
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
                    alt={job.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
            <div className="flex flex-col flex-1 p-4 md:p-5">
              <div className="flex flex-col gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-red-600/80 text-white text-xs font-bold rounded border border-red-600">
                    {job.graduationYear || "2028年卒"}
                  </span>
                  {(job as any).prefecture && (
                    <span className="px-2 py-0.5 bg-gray-600/80 text-white text-xs font-bold rounded border border-gray-600">
                      {(job as any).prefecture}
                    </span>
                  )}
                  {(job as any).employmentType && (
                    <span className="px-2 py-0.5 bg-blue-600/80 text-white text-xs font-bold rounded border border-blue-600">
                      {(job as any).employmentType}
                    </span>
                  )}
                </div>
                <h3 className={cn("text-base md:text-lg font-bold group-hover:text-red-500 transition-colors line-clamp-2", classes.textPrimary)}>
                  {job.title}
                </h3>
              </div>
              {job.location && (
                <div className={cn("flex items-center gap-1.5 text-xs md:text-sm", classes.textMuted)}>
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
                  <span className="line-clamp-1">{job.location}</span>
                </div>
              )}
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
