"use client";

import ProgramSection from "@/components/ProgramSection";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface Documentary {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  linkUrl?: string;
}

export default function DocumentarySectionClient({ documentaries }: { documentaries: Documentary[] }) {
  const { classes } = useMainTheme();

  return (
    <div
      id="documentary"
      className={cn("py-8 scroll-mt-20", classes.contentSectionBg, classes.contentSectionBorder)}
    >
      <ProgramSection
        title="就活ドキュメンタリー"
        description="企業密着や社員インタビューなど、企業を深く知れるドキュメンタリー動画をまとめてお届けします。"
        showMore={false}
        programs={documentaries}
        largeCards={true}
        onProgramClick={(program) => {
          if (program.linkUrl) {
            window.open(program.linkUrl, "_blank", "noopener,noreferrer");
          }
        }}
      />
    </div>
  );
}
