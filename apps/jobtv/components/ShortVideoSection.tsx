"use client";

import { Smartphone } from "lucide-react";
import ShortVideoCard from "./ShortVideoCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import SectionHeader from "./SectionHeader";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_WIDTH } from "@/constants/card-layout";

interface ShortVideo {
  id: string;
  title: string;
  thumbnail: string | null;
  channel: string;
  duration?: string;
  videoUrl?: string;
  streamingUrl?: string | null;
}

interface ShortVideoSectionProps {
  title: string;
  /** 見出しの下に表示する説明文 */
  description?: string;
  videos: ShortVideo[];
  showMore?: boolean;
  onVideoClick?: (video: ShortVideo) => void;
}

export default function ShortVideoSection({
  title,
  description,
  videos,
  showMore = true,
  onVideoClick
}: ShortVideoSectionProps) {
  const { classes } = useMainTheme();

  return (
    <section className="mb-0 py-2">
      <div className="container mx-auto px-4">
        {title && (
          <SectionHeader
            icon={Smartphone}
            title={title}
            showMore={showMore}
            titleClassName={classes.textPrimary}
            className="mb-2"
          />
        )}
        {description && (
          <p className={cn("text-sm mb-3", classes.textSecondary)}>{description}</p>
        )}
        <div className={cn("border-b mb-4", classes.sectionBorder)} />
        <div className="-mx-4 md:mx-0">
          <HorizontalScrollContainer>
            <div className="flex gap-5 min-w-max pl-4 md:pl-0">
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
      </div>
    </section>
  );
}
