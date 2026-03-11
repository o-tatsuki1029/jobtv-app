import MainPageContent from "@/components/main/MainPageContent";
import VideoObjectListJsonLd from "@/components/seo/VideoObjectListJsonLd";
import { getCompaniesByIndustry, type CompanyWithPage } from "@/lib/actions/company-list-actions";
import { getPublicVideosForTopPage } from "@/lib/actions/video-actions";
import { getTopPageBanners } from "@/lib/actions/top-page-banner-actions";
import { getTopPageHeroItems } from "@/lib/actions/top-page-hero-actions";
import { INDUSTRIES } from "@/constants/company-options";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/constants/site";
import type { Metadata } from "next";
import type { HeroItem } from "@/components/HeroSection";

/** トップページのSEO用メタデータ（明示的に title / description を設定） */
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION
};


const accounts = [
  {
    id: "a8",
    name: "企業研究ナビ",
    avatar: "/shorts-icon/shukatsu_kigyokenkyuu.jpeg",
    href: "https://www.tiktok.com/@shukatsu_kigyokenkyuu"
  },
  {
    id: "a9",
    name: "就活おかP",
    avatar: "/shorts-icon/shukatsu_okap.jpeg",
    href: "https://www.tiktok.com/@shukatsu_okap"
  },
  {
    id: "a10",
    name: "りな先生の業界入門✏️",
    avatar: "/shorts-icon/shukatsu_gyoukaikenkyuu.jpeg",
    href: "https://www.tiktok.com/@shukatsu_gyoukaikenkyuu"
  },
  {
    id: "a1",
    name: "JOBTV会社図鑑",
    avatar: "/shorts-icon/jobtv_zukan.jpeg",
    href: "https://www.tiktok.com/@jobtv_zukan"
  },
  {
    id: "a2",
    name: "JOBTV企業ガイド",
    avatar: "/shorts-icon/jobtv_kigyogaido.jpeg",
    href: "https://www.tiktok.com/@jobtv_kigyogaido"
  },
  {
    id: "a3",
    name: "JOBTV Voice / 社員の声",
    avatar: "/shorts-icon/jobtv_voice.jpeg",
    href: "https://www.tiktok.com/@jobtv_voice"
  },
  {
    id: "a4",
    name: "JOBTV Real / 社員の１日",
    avatar: "/shorts-icon/jobtv__real.jpeg",
    href: "https://www.tiktok.com/@jobtv__real"
  },
  {
    id: "a5",
    name: "JOBTV Tour / オフィス図鑑",
    avatar: "/shorts-icon/jobtv_tour.jpeg",
    href: "https://www.tiktok.com/@jobtv_tour"
  },
  {
    id: "a6",
    name: "JOBTV Guide / 企業名鑑",
    avatar: "/shorts-icon/jobtv_guide.jpeg",
    href: "https://www.tiktok.com/@jobtv_guide"
  },
  {
    id: "a7",
    name: "JOBTV HR / 就活のヒント",
    avatar: "/shorts-icon/jobtv_hr.jpeg",
    href: "https://www.tiktok.com/@jobtv_hr"
  }
];

/** しゅんダイアリー就活対策動画のダミーデータ（サムネは public/shundiary の画像） */
const shundiaryVideos = [
  { id: "sd-1", title: "就活対策動画 #1", thumbnail: "/shundiary/01.webp" },
  { id: "sd-2", title: "就活対策動画 #2", thumbnail: "/shundiary/02.webp" },
  { id: "sd-3", title: "就活対策動画 #3", thumbnail: "/shundiary/03.webp" },
  { id: "sd-4", title: "就活対策動画 #4", thumbnail: "/shundiary/04.webp" },
  { id: "sd-5", title: "就活対策動画 #5", thumbnail: "/shundiary/05.jpg" },
  { id: "sd-6", title: "就活対策動画 #6", thumbnail: "/shundiary/06.webp" },
  { id: "sd-7", title: "就活対策動画 #7", thumbnail: "/shundiary/07.jpg" },
  { id: "sd-8", title: "就活対策動画 #8", thumbnail: "/shundiary/08.jpg" },
  { id: "sd-9", title: "就活対策動画 #9", thumbnail: "/shundiary/09.webp" },
  { id: "sd-10", title: "就活対策動画 #10", thumbnail: "/shundiary/10.webp" }
];

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

  let documentaryPrograms: Array<{
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

  try {
    const [companiesResult, shortResult, documentaryResult, bannersResult, heroResult] = await Promise.all([
      getCompaniesByIndustry(),
      getPublicVideosForTopPage("short"),
      getPublicVideosForTopPage("documentary"),
      getTopPageBanners(),
      getTopPageHeroItems()
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

    documentaryPrograms = (documentaryResult.data ?? []).map((v) => ({
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
  } catch (e) {
    console.error("Home: data fetch error", e);
  }

  return (
    <>
      <VideoObjectListJsonLd videos={[...shortVideos, ...documentaryPrograms]} />
      <MainPageContent
        heroPrograms={heroPrograms}
        banners={banners}
        shortVideos={shortVideos}
        accounts={accounts}
        documentaryPrograms={documentaryPrograms}
        shundiaryVideos={shundiaryVideos}
        industrySections={industrySections}
      />
    </>
  );
}
