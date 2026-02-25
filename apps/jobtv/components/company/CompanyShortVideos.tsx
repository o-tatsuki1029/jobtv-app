"use client";

import React, { useState } from "react";
import ShortVideoSection from "@/components/ShortVideoSection";
import VideoModal from "@/components/VideoModal";
import type { CompanyData } from "./types";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyShortVideosProps {
  company: CompanyData;
}

export default function CompanyShortVideos({ company }: CompanyShortVideosProps) {
  const [selectedVideo, setSelectedVideo] = useState<{
    videoUrl: string;
    streamingUrl?: string | null;
    title: string;
    thumbnail?: string;
  } | null>(null);
  const { classes } = useMainTheme();

  if (!company.shortVideos || company.shortVideos.length === 0) return null;

  return (
    <section>
      <h2 className={cn("text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2", classes.textPrimary)}>
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        ショート動画
      </h2>
      <ShortVideoSection
        title=""
        videos={company.shortVideos.map((v) => ({
          id: v.id,
          title: v.title,
          thumbnail: v.thumbnail || null,
          channel: "ショート動画",
          duration: "0:00",
          videoUrl: v.video,
          streamingUrl: v.streamingUrl ?? null
        }))}
        showMore={false}
        onVideoClick={(video) => {
          if (video.videoUrl || video.streamingUrl) {
            setSelectedVideo({
              videoUrl: video.videoUrl || video.streamingUrl || "",
              streamingUrl: video.streamingUrl ?? undefined,
              title: video.title,
              thumbnail: video.thumbnail || undefined
            });
          }
        }}
      />

      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.videoUrl}
          streamingUrl={selectedVideo.streamingUrl}
          title={selectedVideo.title}
          thumbnail={selectedVideo.thumbnail}
          aspectRatio="portrait"
        />
      )}
    </section>
  );
}
