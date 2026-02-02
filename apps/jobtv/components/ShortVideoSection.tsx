"use client";

import ShortVideoCard from "./ShortVideoCard";
import HorizontalScrollContainer from "./HorizontalScrollContainer";

interface ShortVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  likes?: number;
  duration?: string;
}

interface ShortVideoSectionProps {
  title: string;
  videos: ShortVideo[];
  showMore?: boolean;
}

export default function ShortVideoSection({ title, videos, showMore = true }: ShortVideoSectionProps) {
  return (
    <section className="mb-0 py-2">
      <div className="container mx-auto px-4">
        {title && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
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
            <div className="border-b border-gray-700"></div>
          </div>
        )}
        <HorizontalScrollContainer ignoreParentPadding={true}>
          <div className="flex gap-5 min-w-max px-4 pb-6">
            {videos.map((video) => (
              <div key={video.id} className="w-[160px] sm:w-[180px] md:w-[200px] flex-shrink-0">
                <ShortVideoCard
                  title={video.title}
                  thumbnail={video.thumbnail}
                  channel={video.channel}
                  likes={video.likes}
                  duration={video.duration}
                />
              </div>
            ))}
          </div>
        </HorizontalScrollContainer>
      </div>
    </section>
  );
}
