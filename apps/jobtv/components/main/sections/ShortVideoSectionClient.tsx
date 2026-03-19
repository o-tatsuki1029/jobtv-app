"use client";

import ShortVideoSection from "@/components/ShortVideoSection";
import { useVideoModal } from "@/components/main/VideoModalProvider";

interface ShortVideo {
  id: string;
  title: string;
  thumbnail: string | null;
  channel: string;
  duration?: string;
  videoUrl?: string;
  streamingUrl?: string | null;
}

export default function ShortVideoSectionClient({ videos }: { videos: ShortVideo[] }) {
  const { openVideoModal } = useVideoModal();

  return (
    <div id="short" className="scroll-mt-20 py-8">
      <ShortVideoSection
        title="就活Shorts"
        description="短い動画で企業の雰囲気や社員の声をチェック。気になる企業を手軽に発見しよう。"
        showMore={false}
        videos={videos}
        onVideoClick={(video) => {
          if (video.videoUrl || video.streamingUrl) {
            openVideoModal({
              videoUrl: video.videoUrl || video.streamingUrl || "",
              streamingUrl: video.streamingUrl,
              title: video.title,
              thumbnail: video.thumbnail ?? undefined,
              aspectRatio: "portrait",
            });
          }
        }}
      />
    </div>
  );
}
