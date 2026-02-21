"use client";

import React, { useState } from "react";
import ShortVideoSection from "@/components/ShortVideoSection";
import VideoModal from "@/components/VideoModal";
import type { CompanyData } from "./types";
import { useMainTheme } from "./CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanyShortVideosProps {
  company: CompanyData;
}

export default function CompanyShortVideos({ company }: CompanyShortVideosProps) {
  const [selectedVideo, setSelectedVideo] = useState<{
    videoUrl: string;
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
          videoUrl: v.video
        }))}
        showMore={false}
        onVideoClick={(video) => {
          if (video.videoUrl) {
            setSelectedVideo({
              videoUrl: video.videoUrl,
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
          title={selectedVideo.title}
          thumbnail={selectedVideo.thumbnail}
          aspectRatio="portrait"
        />
      )}
    </section>
  );
}
