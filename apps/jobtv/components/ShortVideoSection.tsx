"use client";

import ShortVideoCard from "./ShortVideoCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import { useMainTheme } from "@/components/company/CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_WIDTH } from "@/constants/card-layout";

interface ShortVideo {
  id: string;
  title: string;
  thumbnail: string | null;
  channel: string;
  duration?: string;
  videoUrl?: string;
}

interface ShortVideoSectionProps {
  title: string;
  videos: ShortVideo[];
  showMore?: boolean;
  onVideoClick?: (video: ShortVideo) => void;
}

export default function ShortVideoSection({ title, videos, showMore = true, onVideoClick }: ShortVideoSectionProps) {
  const { classes } = useMainTheme();

  return (
    <section className="mb-0 py-2">
      <div className="container mx-auto">
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
        <HorizontalScrollContainer>
          <div className="flex gap-5 min-w-max">
            {videos.map((video) => (
              <div key={video.id} className={cn(HORIZONTAL_CARD_WIDTH.shortVideo, "flex-shrink-0")}>
                <ShortVideoCard
                  title={video.title}
                  thumbnail={video.thumbnail}
                  channel={video.channel}
                  duration={video.duration}
                  onClick={() => onVideoClick?.(video)}
                />
              </div>
            ))}
          </div>
        </HorizontalScrollContainer>
      </div>
    </section>
  );
}
