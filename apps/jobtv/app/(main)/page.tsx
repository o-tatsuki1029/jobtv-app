import { Suspense } from "react";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/constants/site";
import type { Metadata } from "next";
import VideoModalProvider from "@/components/main/VideoModalProvider";
import MainThemeWrapper from "@/components/main/MainThemeWrapper";
import ContentAreaWrapper from "@/components/main/ContentAreaWrapper";
import HeroSectionServer from "@/components/main/sections/HeroSectionServer";
import BannerSectionServer from "@/components/main/sections/BannerSectionServer";
import ShortVideoSectionServer from "@/components/main/sections/ShortVideoSectionServer";
import AccountSectionServer from "@/components/main/sections/AccountSectionServer";
import DocumentarySectionServer from "@/components/main/sections/DocumentarySectionServer";
import ShukatsuVideoSectionServer from "@/components/main/sections/ShukatsuVideoSectionServer";
import ShundiarySectionServer from "@/components/main/sections/ShundiarySectionServer";
import CompanySectionServer from "@/components/main/sections/CompanySectionServer";
import {
  BannerSkeleton,
  ShortVideoSkeleton,
  AccountSkeleton,
  SectionSkeleton,
  ShundiarySkeleton,
  CompanySkeleton,
} from "@/components/main/sections/skeletons";

/** トップページのSEO用メタデータ（明示的に title / description を設定） */
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
};

export default function Home() {
  return (
    <VideoModalProvider>
      <MainThemeWrapper>
        <HeroSectionServer />
        <ContentAreaWrapper>
          <Suspense fallback={<BannerSkeleton />}>
            <BannerSectionServer />
          </Suspense>
          <Suspense fallback={<ShortVideoSkeleton />}>
            <ShortVideoSectionServer />
          </Suspense>
          <Suspense fallback={<AccountSkeleton />}>
            <AccountSectionServer />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <DocumentarySectionServer />
          </Suspense>
          <Suspense fallback={<SectionSkeleton />}>
            <ShukatsuVideoSectionServer />
          </Suspense>
          <Suspense fallback={<ShundiarySkeleton />}>
            <ShundiarySectionServer />
          </Suspense>
          <Suspense fallback={<CompanySkeleton />}>
            <CompanySectionServer />
          </Suspense>
        </ContentAreaWrapper>
      </MainThemeWrapper>
    </VideoModalProvider>
  );
}
