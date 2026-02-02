"use client";

import ShortVideoSection from "@/components/ShortVideoSection";
import type { CompanyData } from "./types";

interface CompanyShortVideosProps {
  company: CompanyData;
}

export default function CompanyShortVideos({ company }: CompanyShortVideosProps) {
  if (!company.shortVideos || company.shortVideos.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 flex items-center gap-2">
        <span className="w-1.5 h-5 md:h-6 bg-red-600 rounded-full" />
        ショート動画
      </h2>
      <ShortVideoSection
        title=""
        videos={company.shortVideos.map((v) => ({
          id: v.id,
          title: v.title,
          thumbnail: v.thumbnail || "",
          channel: "ショート動画",
          likes: 0,
          duration: "0:00"
        }))}
        showMore={false}
      />
    </section>
  );
}
