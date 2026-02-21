"use client";

import ProgramCard from "./ProgramCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import { useMainTheme } from "@/components/company/CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface Program {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  time?: string;
  viewers?: number;
  isLive?: boolean;
}

interface ProgramSectionProps {
  title: string;
  programs: Program[];
  showMore?: boolean;
  largeCards?: boolean;
  vertical?: boolean;
}

export default function ProgramSection({
  title,
  programs,
  showMore = true,
  largeCards = false,
  vertical = false
}: ProgramSectionProps) {
  const { classes } = useMainTheme();

  if (vertical) {
    return (
      <section className="mb-2 py-0">
        <div className="container mx-auto px-4">
          {title && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className={cn("text-2xl md:text-3xl font-bold", classes.textPrimary)}>{title}</h2>
                {showMore && (
                  <a
                    href="#"
                    className="text-red-500 hover:text-red-400 text-sm font-semibold transition-colors flex items-center gap-1 group"
                  >
                    もっと見る
                    <svg
                      className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}
          <HorizontalScrollContainer>
            <div className="flex gap-4 min-w-max px-4 pb-6">
                {programs.map((program) => (
                  <div key={program.id} className="w-[120px] sm:w-[140px] md:w-[160px] flex-shrink-0">
                    <ProgramCard
                      title={program.title}
                      thumbnail={program.thumbnail}
                      channel={program.channel}
                      time={program.time}
                      viewers={program.viewers}
                      isLive={program.isLive}
                      vertical={vertical}
                    />
                  </div>
                ))}
              </div>
          </HorizontalScrollContainer>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="container mx-auto px-4">
        {title && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className={cn("text-2xl md:text-3xl font-bold", classes.textPrimary)}>{title}</h2>
              {showMore && (
                <a
                  href="#"
                  className="text-red-500 hover:text-red-400 text-sm font-semibold transition-colors flex items-center gap-1 group"
                >
                  もっと見る
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              )}
            </div>
            <div className={cn("border-b", classes.sectionBorder)} />
          </div>
        )}
        <div
          className={`grid gap-5 ${
            largeCards
              ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          }`}
        >
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              title={program.title}
              thumbnail={program.thumbnail}
              channel={program.channel}
              time={program.time}
              viewers={program.viewers}
              isLive={program.isLive}
              vertical={vertical}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
