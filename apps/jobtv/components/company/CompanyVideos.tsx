"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import HorizontalScrollContainer from "@/components/HorizontalScrollContainer";
import VideoModal from "@/components/VideoModal";
import type { CompanyData } from "./types";

interface CompanyVideosProps {
  company: CompanyData;
}

export default function CompanyVideos({ company }: CompanyVideosProps) {
  const [selectedVideo, setSelectedVideo] = useState<{
    videoUrl: string;
    title: string;
    thumbnail?: string;
  } | null>(null);

  if (!company.documentaryVideos || company.documentaryVideos.length === 0) return null;

  return (
    <section className="-mx-4 md:-mx-0">
      <h2 className="px-4 md:px-0 text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        動画
      </h2>
      <HorizontalScrollContainer ignoreParentPadding={true}>
        <div className="flex gap-4 md:gap-6 min-w-max px-4 md:px-0">
          {company.documentaryVideos.map((video) => (
            <div
              key={video.id}
              className="flex-shrink-0 w-[320px] md:w-[400px] group cursor-pointer"
              onClick={() =>
                setSelectedVideo({
                  videoUrl: video.video,
                  title: video.title,
                  thumbnail: video.thumbnail || company.coverImage || undefined
                })
              }
            >
              <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl bg-gray-900 mb-3">
                {video.thumbnail || company.coverImage ? (
                  <Image
                    src={video.thumbnail || company.coverImage}
                    alt={video.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <Play className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 md:w-8 md:h-8 text-white fill-current ml-1" />
                  </div>
                </div>
              </div>
              {video.title && (
                <div className="px-1">
                  <h3 className="text-sm md:text-base font-bold text-white line-clamp-2 group-hover:text-red-500 transition-colors">
                    {video.title}
                  </h3>
                </div>
              )}
            </div>
          ))}
        </div>
      </HorizontalScrollContainer>

      {selectedVideo && (
        <VideoModal
          isOpen={!!selectedVideo}
          onClose={() => setSelectedVideo(null)}
          videoUrl={selectedVideo.videoUrl}
          title={selectedVideo.title}
          thumbnail={selectedVideo.thumbnail}
          aspectRatio="video"
        />
      )}
    </section>
  );
}
