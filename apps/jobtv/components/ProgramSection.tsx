"use client";

import { Film } from "lucide-react";
import ProgramCard from "./ProgramCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import SectionHeader from "./SectionHeader";
import { useMainTheme } from "@/components/theme/PageThemeContext";
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
            <SectionHeader icon={Film} title={title} showMore={showMore} titleClassName={classes.textPrimary} />
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
          <SectionHeader
            icon={Film}
            title={title}
            showMore={showMore}
            showBorder
            borderClassName={classes.sectionBorder}
            titleClassName={classes.textPrimary}
          />
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
