import MainPageContent from "@/components/main/MainPageContent";
import { getCompaniesByIndustry, type CompanyWithPage } from "@/lib/actions/company-list-actions";
import { getPublicVideosForTopPage } from "@/lib/actions/video-actions";
import { INDUSTRIES } from "@/constants/company-options";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/constants/site";
import type { Metadata } from "next";

/** トップページのSEO用メタデータ（明示的に title / description を設定） */
export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION
};

// サンプルデータ
const banners = [
  {
    id: "e1",
    title: "2027年向け 採用イベント",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=450&fit=crop"
  },
  {
    id: "e2",
    title: "企業密1日着動画特集",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop"
  },
  {
    id: "b1",
    title: "2025年新卒採用エントリー受付中！",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=450&fit=crop"
  },
  {
    id: "b2",
    title: "中途採用・キャリア採用 積極募集中",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=450&fit=crop"
  },
  {
    id: "b3",
    title: "オンライン企業説明会 毎週開催中",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=450&fit=crop"
  },
  {
    id: "b4",
    title: "インターンシッププログラム 参加者募集",
    image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=450&fit=crop"
  },
  {
    id: "b5",
    title: "エンジニア職 大募集！未経験者も歓迎",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=450&fit=crop"
  }
];

const heroProgram = {
  title: "動画就活で理想の企業と出会う",
  description:
    "テキストだけではわからない採用企業の姿を、動画コンテンツでお届け。企業密着、社員インタビュー、職場見学など、リアルな情報を無料で視聴できます。",
  thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=600&fit=crop",
  videoUrl: "https://contents.jobtv.jp/movie/f45f4fe1-55b6-45bb-804b-00d1bdde6b71_h264.mp4",
  channel: "JOBTV",
  viewers: 12543
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

  try {
    const [companiesResult, shortResult, documentaryResult] = await Promise.all([
      getCompaniesByIndustry(),
      getPublicVideosForTopPage("short"),
      getPublicVideosForTopPage("documentary")
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
  } catch (e) {
    console.error("Home: data fetch error", e);
  }

  return (
    <MainPageContent
      heroProgram={heroProgram}
      banners={banners}
      shortVideos={shortVideos}
      accounts={accounts}
      documentaryPrograms={documentaryPrograms}
      shundiaryVideos={shundiaryVideos}
      industrySections={industrySections}
    />
  );
}
