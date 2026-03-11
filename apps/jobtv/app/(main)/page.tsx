import MainPageContent from "@/components/main/MainPageContent";
import VideoObjectListJsonLd from "@/components/seo/VideoObjectListJsonLd";
import { getCompaniesByIndustry, type CompanyWithPage } from "@/lib/actions/company-list-actions";
import { getPublicVideosForTopPage } from "@/lib/actions/video-actions";
import { getTopPageBanners } from "@/lib/actions/top-page-banner-actions";
import { getTopPageHeroItems } from "@/lib/actions/top-page-hero-actions";
import { getTopPageAmbassadors } from "@/lib/actions/top-page-ambassador-actions";
import { getTopPageDocumentaries } from "@/lib/actions/top-page-documentary-actions";
import { getTopPageShunDiaries } from "@/lib/actions/top-page-shundiary-actions";
import { INDUSTRIES } from "@/constants/company-options";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/constants/site";
import type { Metadata } from "next";
import type { HeroItem } from "@/components/HeroSection";

/** トップページのSEO用メタデータ（明示的に title / description を設定） */
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION
};

export default async function Home() {
  // 企業データを業界ごとに取得
  let industrySections: Array<{
    value: string;
    label: string;
    companies: Array<{ id: string; name: string; logo_url: string | null; thumbnail_url: string | null }>;
  }> = [];

  let shortVideos: Array<{
    id: string;
    title: string;
    thumbnail: string | null;
    channel: string;
    duration?: string;
    videoUrl?: string;
    streamingUrl?: string | null;
  }> = [];

  let shukatsuVideos: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
    time?: string;
    videoUrl?: string;
    streamingUrl?: string | null;
  }> = [];

  let banners: Array<{ id: string; title: string; image: string; link?: string }> = [];
  let heroPrograms: HeroItem[] = [];
  let accounts: Array<{ id: string; name: string; avatar: string; href?: string }> = [];
  let documentaries: Array<{ id: string; title: string; thumbnail: string; channel: string; linkUrl?: string }> = [];
  let shundiaryVideos: Array<{ id: string; title: string; thumbnail: string; linkUrl?: string }> = [];

  try {
    const [
      companiesResult,
      shortResult,
      shukatsuResult,
      bannersResult,
      heroResult,
      ambassadorsResult,
      documentariesResult,
      shunDiariesResult
    ] = await Promise.all([
      getCompaniesByIndustry(),
      getPublicVideosForTopPage("short"),
      getPublicVideosForTopPage("documentary"),
      getTopPageBanners(),
      getTopPageHeroItems(),
      getTopPageAmbassadors(),
      getTopPageDocumentaries(),
      getTopPageShunDiaries()
    ]);

    const companiesByIndustry = companiesResult.data ?? new Map<string, CompanyWithPage[]>();
    const industries = INDUSTRIES.filter((industry) => industry.value !== "");

    industrySections = industries
      .map((industry) => {
        const companies = companiesByIndustry.get(industry.value);
        if (!companies || companies.length === 0) return null;
        return {
          value: industry.value,
          label: industry.label,
          companies: companies.map((c: CompanyWithPage) => ({
            id: c.id,
            name: c.name ?? "",
            logo_url: c.logo_url ?? null,
            thumbnail_url: c.thumbnail_url ?? null
          }))
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    shortVideos = (shortResult.data ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail_url || v.auto_thumbnail_url || null,
      channel: v.company_name || "",
      streamingUrl: v.streaming_url ?? null,
      videoUrl: v.video_url ?? undefined
    }));

    shukatsuVideos = (shukatsuResult.data ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      thumbnail: v.thumbnail_url || v.auto_thumbnail_url || "",
      channel: v.company_name || "",
      streamingUrl: v.streaming_url ?? null,
      videoUrl: v.video_url ?? undefined
    }));

    banners = (bannersResult.data ?? []).map((b) => ({
      id: b.id,
      title: b.title,
      image: b.image_url,
      link: b.link_url ?? undefined
    }));

    heroPrograms = (heroResult.data ?? []).map((h) => ({
      thumbnail: h.thumbnail_url || h.auto_thumbnail_url || "",
      videoUrl: h.video_url ?? undefined,
      isPR: h.is_pr,
      moreLink: h.link_url ?? undefined,
      title: h.title
    }));

    accounts = (ambassadorsResult.data ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar_url,
      href: a.link_url ?? undefined
    }));

    documentaries = (documentariesResult.data ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      thumbnail: d.thumbnail_url,
      channel: d.channel,
      linkUrl: d.link_url ?? undefined
    }));

    shundiaryVideos = (shunDiariesResult.data ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      thumbnail: s.thumbnail_url,
      linkUrl: s.link_url ?? undefined
    }));
  } catch (e) {
    console.error("Home: data fetch error", e);
  }

  return (
    <>
      <VideoObjectListJsonLd videos={[...shortVideos, ...shukatsuVideos]} />
      <MainPageContent
        heroPrograms={heroPrograms}
        banners={banners}
        shortVideos={shortVideos}
        accounts={accounts}
        documentaries={documentaries}
        shukatsuVideos={shukatsuVideos}
        shundiaryVideos={shundiaryVideos}
        industrySections={industrySections}
      />
    </>
  );
}
