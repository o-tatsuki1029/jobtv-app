"use client";

import ShundiarySection from "@/components/ShundiarySection";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface ShundiaryItem {
  id: string;
  title: string;
  thumbnail: string;
  linkUrl?: string;
}

export default function ShundiarySectionClient({ items }: { items: ShundiaryItem[] }) {
  const { classes } = useMainTheme();

  return (
    <div
      id="shundiary"
      className={cn("py-8 scroll-mt-20", classes.contentSectionBg, classes.contentSectionBorder)}
    >
      <ShundiarySection
        title="しゅんダイアリー就活対策動画"
        description="就活対策に役立つ動画をまとめてお届けします。"
        items={items}
      />
    </div>
  );
}
