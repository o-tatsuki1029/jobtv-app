"use client";

import ProgramSection from "@/components/ProgramSection";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { useVideoModal } from "@/components/main/VideoModalProvider";
import { cn } from "@jobtv-app/shared/utils/cn";

interface ShukatsuVideo {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  time?: string;
  videoUrl?: string;
  streamingUrl?: string | null;
}

export default function ShukatsuVideoSectionClient({ videos }: { videos: ShukatsuVideo[] }) {
  const { classes } = useMainTheme();
  const { openVideoModal } = useVideoModal();

  return (
    <div
      id="shukatsu-videos"
      className={cn("py-8 scroll-mt-20", classes.contentSectionBg, classes.contentSectionBorder)}
    >
      <ProgramSection
        title="就活Videos"
        description="企業密着や社員インタビューなど、企業を深く知れる動画をまとめてお届けします。"
        showMore={false}
        programs={videos}
        largeCards={true}
        onProgramClick={(program) => {
          if (program.videoUrl || program.streamingUrl) {
            openVideoModal({
              videoUrl: program.videoUrl || program.streamingUrl || "",
              streamingUrl: program.streamingUrl,
              title: program.title,
              thumbnail: program.thumbnail,
              aspectRatio: "video",
            });
          }
        }}
      />
    </div>
  );
}
