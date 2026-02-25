import MainPageContent from "@/components/main/MainPageContent";
import { getCompaniesByIndustry, type CompanyWithPage } from "@/lib/actions/company-list-actions";
import { getPublicVideos } from "@/lib/actions/video-actions";
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
    id: "a1",
    name: "JOB NEWS",
    avatar: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop"
  },
  {
    id: "a2",
    name: "JOB TIMES",
    avatar: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=100&h=100&fit=crop"
  },
  {
    id: "a3",
    name: "JOB PICKS",
    avatar: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=100&h=100&fit=crop"
  },
  {
    id: "a4",
    name: "JOB PRESS",
    avatar: "https://images.unsplash.com/photo-1504006833117-8886a355efbf?w=100&h=100&fit=crop"
  },
  {
    id: "a5",
    name: "JOB JOURNAL",
    avatar: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop"
  },
  {
    id: "a6",
    name: "JOB VOICE",
    avatar: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop"
  },
  {
    id: "a7",
    name: "JOB TV",
    avatar: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=100&h=100&fit=crop"
  },
  {
    id: "a8",
    name: "JOB TALK",
    avatar: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=100&h=100&fit=crop"
  },
  {
    id: "a9",
    name: "JOB CHANNEL",
    avatar: "https://images.unsplash.com/photo-1504006833117-8886a355efbf?w=100&h=100&fit=crop"
  },
  {
    id: "a10",
    name: "JOB HUNT",
    avatar: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop"
  },
  {
    id: "a11",
    name: "CAREER NEWS",
    avatar: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop"
  },
  {
    id: "a12",
    name: "RECRUIT JOURNAL",
    avatar: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=100&h=100&fit=crop"
  },
  {
    id: "a13",
    name: "WORK STYLE PRESS",
    avatar: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=100&h=100&fit=crop"
  },
  {
    id: "a14",
    name: "JOB PICKS",
    avatar: "https://images.unsplash.com/photo-1504006833117-8886a355efbf?w=100&h=100&fit=crop"
  },
  {
    id: "a15",
    name: "NEXT CAREER TIMES",
    avatar: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop"
  },
  {
    id: "a16",
    name: "HR TALK",
    avatar: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=100&h=100&fit=crop"
  },
  {
    id: "a17",
    name: "BIZREACH VOICE",
    avatar: "https://images.unsplash.com/photo-1437622368342-7a3d73a34c8f?w=100&h=100&fit=crop"
  },
  {
    id: "a18",
    name: "CAREER HACK CHANNEL",
    avatar: "https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=100&h=100&fit=crop"
  },
  {
    id: "a19",
    name: "RECRUIT TV",
    avatar: "https://images.unsplash.com/photo-1504006833117-8886a355efbf?w=100&h=100&fit=crop"
  },
  {
    id: "a20",
    name: "JOB HUNT JOURNAL",
    avatar: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop"
  }
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
      getPublicVideos("short"),
      getPublicVideos("documentary")
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
      industrySections={industrySections}
    />
  );
}
