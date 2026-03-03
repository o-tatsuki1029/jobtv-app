"use client";

import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import ProgramSection from "@/components/ProgramSection";
import ShortVideoSection from "@/components/ShortVideoSection";
import ShundiarySection from "@/components/ShundiarySection";
import BannerList from "@/components/BannerList";
import AccountList from "@/components/AccountList";
import CompanySection from "@/components/CompanySection";
import VideoModal from "@/components/VideoModal";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

export interface MainPageIndustrySection {
  value: string;
  label: string;
  companies: Array<{
    id: string;
    name: string;
    logo_url: string | null;
    /** トップ企業カード用。未設定時は logo_url を表示 */
    thumbnail_url?: string | null;
  }>;
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
  shortVideos: Array<{
    id: string;
    title: string;
    thumbnail: string | null;
    channel: string;
    duration?: string;
    videoUrl?: string;
    streamingUrl?: string | null;
  }>;
  accounts: Array<{ id: string; name: string; avatar: string; href?: string }>;
  documentaryPrograms: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
    time?: string;
    videoUrl?: string;
    streamingUrl?: string | null;
  }>;
  shundiaryVideos: Array<{ id: string; title: string; thumbnail: string }>;
  industrySections: MainPageIndustrySection[];
}

export default function MainPageContent({
  heroProgram,
  banners,
  shortVideos,
  accounts,
  documentaryPrograms,
  shundiaryVideos,
  industrySections
}: MainPageContentProps) {
  const { classes } = useMainTheme();
  const [modalVideo, setModalVideo] = useState<{
    videoUrl: string;
    streamingUrl?: string | null;
    title: string;
    thumbnail?: string;
    aspectRatio?: "video" | "portrait";
  } | null>(null);

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
        <div className={classes.bannerListBg}>
          <BannerList banners={banners} />
        </div>

        <div id="short" className="scroll-mt-20 py-8">
          <ShortVideoSection
            title="就活Shorts"
            description="短い動画で企業の雰囲気や社員の声をチェック。気になる企業を手軽に発見しよう。"
            showMore={false}
            videos={shortVideos}
            onVideoClick={(video) => {
              if (video.videoUrl || video.streamingUrl) {
                setModalVideo({
                  videoUrl: video.videoUrl || video.streamingUrl || "",
                  streamingUrl: video.streamingUrl,
                  title: video.title,
                  thumbnail: video.thumbnail ?? undefined,
                  aspectRatio: "portrait"
                });
              }
            }}
          />
        </div>
        <AccountList accounts={accounts} />
        <div
          id="documentary"
          className={cn("py-8 scroll-mt-20", classes.contentSectionBg, classes.contentSectionBorder)}
        >
          <ProgramSection
            title="就活ドキュメンタリー"
            description="企業密着や社員インタビューなど、企業を深く知れるドキュメンタリー動画をまとめてお届けします。"
            showMore={false}
            programs={documentaryPrograms}
            largeCards={true}
            onProgramClick={(program) => {
              if (program.videoUrl || program.streamingUrl) {
                setModalVideo({
                  videoUrl: program.videoUrl || program.streamingUrl || "",
                  streamingUrl: program.streamingUrl,
                  title: program.title,
                  thumbnail: program.thumbnail,
                  aspectRatio: "video"
                });
              }
            }}
          />
        </div>
        <div
          id="shundiary"
          className={cn("py-8 scroll-mt-20", classes.contentSectionBg, classes.contentSectionBorder)}
        >
          <ShundiarySection
            title="しゅんダイアリー就活対策動画"
            description="就活対策に役立つ動画をまとめてお届けします。"
            items={shundiaryVideos ?? []}
          />
        </div>
        {Array.isArray(industrySections) && (
          <div id="company" className="scroll-mt-20">
            {industrySections.map((industry) => (
              <div key={industry.value} id={`company-${industry.value}`} className="scroll-mt-20 py-4">
              <CompanySection
                title={industry.label}
                companies={industry.companies.map((c) => ({
                  id: c.id,
                  name: c.name,
                  logo_url: c.logo_url ?? null,
                  thumbnail_url: c.thumbnail_url ?? null
                }))}
              />
              </div>
            ))}
          </div>
        )}
      </div>

      {modalVideo && (
        <VideoModal
          isOpen={true}
          onClose={() => setModalVideo(null)}
          videoUrl={modalVideo.videoUrl}
          streamingUrl={modalVideo.streamingUrl}
          title={modalVideo.title}
          thumbnail={modalVideo.thumbnail}
          aspectRatio={modalVideo.aspectRatio}
        />
      )}
    </div>
  );
}
