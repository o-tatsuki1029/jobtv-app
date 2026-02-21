"use client";

import HeroSection from "@/components/HeroSection";
import ProgramSection from "@/components/ProgramSection";
import ShortVideoSection from "@/components/ShortVideoSection";
import BannerList from "@/components/BannerList";
import AccountList from "@/components/AccountList";
import CompanySection from "@/components/CompanySection";
import SectionNavigation from "@/components/SectionNavigation";
import { useMainTheme } from "@/components/company/CompanyPageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

export interface MainPageSection {
  id: string;
  label: string;
}

export interface MainPageIndustrySection {
  value: string;
  label: string;
  companies: Array<{ id: string; name: string; logo_url: string | null }>;
}

export interface MainPageContentProps {
  heroProgram: {
    title: string;
    description: string;
    thumbnail: string;
    videoUrl: string;
    channel: string;
    viewers: number;
  };
  banners: Array<{ id: string; title: string; image: string }>;
  sections: MainPageSection[];
  shortVideos: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
    duration: string;
    videoUrl?: string;
  }>;
  accounts: Array<{ id: string; name: string; avatar: string }>;
  documentaryPrograms: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
    time: string;
  }>;
  industrySections: MainPageIndustrySection[];
}

export default function MainPageContent({
  heroProgram,
  banners,
  sections,
  shortVideos,
  accounts,
  documentaryPrograms,
  industrySections
}: MainPageContentProps) {
  const { classes } = useMainTheme();

  return (
    <div className={cn("min-h-screen", classes.pageBg, classes.pageText)}>
      <HeroSection
        title={heroProgram.title}
        description={heroProgram.description}
        thumbnail={heroProgram.thumbnail}
        videoUrl={heroProgram.videoUrl}
        channel={heroProgram.channel}
        viewers={heroProgram.viewers}
      />
      <div className={classes.contentAreaBg}>
        <BannerList banners={banners} />

        <SectionNavigation sections={sections} />

        <div id="short" className="scroll-mt-20 py-8">
          <ShortVideoSection title="⚡ 就活Shorts" videos={shortVideos} />
        </div>
        <AccountList accounts={accounts} />
        <div
          id="documentary"
          className={cn("py-8 scroll-mt-20", classes.contentSectionBg, classes.contentSectionBorder)}
        >
          <ProgramSection title="📹 就活ドキュメンタリー" programs={documentaryPrograms} largeCards={true} />
        </div>
        {industrySections.map((industry) => (
          <div key={industry.value} id={`company-${industry.value}`} className="scroll-mt-20 py-4">
            <CompanySection
              title={industry.label}
              companies={industry.companies.map((c) => ({
                id: c.id,
                name: c.name,
                logo_url: c.logo_url
              }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
