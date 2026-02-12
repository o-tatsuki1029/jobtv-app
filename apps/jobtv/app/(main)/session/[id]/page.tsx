import SessionDetailView from "@/components/SessionDetailView";
import { getSession, getSessionDates } from "@/lib/actions/session-actions";
import { getCompanyProfileById } from "@/lib/actions/company-profile-actions";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface SessionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 説明会詳細ページのメタデータを生成
 */
export async function generateMetadata({ params }: SessionDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  // 説明会情報を取得
  const { data: session, error: sessionError } = await getSession(id);

  if (sessionError || !session) {
    return {
      title: "説明会が見つかりません",
      description: "お探しの説明会は見つかりませんでした。"
    };
  }

  // 企業情報を取得
  const { data: company } = await getCompanyProfileById(session.company_id || "");

  // タイトルを生成
  const title = `${session.title} | ${company?.name || "企業"} | JOBTV`;

  // 説明文を生成
  const description = session.description
    ? session.description.replace(/\n/g, " ").substring(0, 120) + (session.description.length > 120 ? "..." : "")
    : `${company?.name || "企業"}の${session.title}の説明会情報。`;

  // OGP画像を決定（カバー画像 > 企業ロゴ > デフォルト）
  const ogImage = session.cover_image_url || company?.logo_url || undefined;

  // キーワードを生成
  const keywords = [session.title, company?.name, session.type, session.location_type, "説明会", "就活", "JobTV"].filter(
    Boolean
  );

  return {
    title,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: session.title
            }
          ]
        : undefined,
      siteName: "JOBTV"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined
    },
    alternates: {
      canonical: `/session/${id}`
    }
  };
}

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = await params;

  // 説明会情報を取得
  const { data: session, error: sessionError } = await getSession(id);

  if (sessionError || !session) {
    console.error("Failed to fetch session:", sessionError);
    notFound();
  }

  // 企業情報を取得
  if (!session.company_id) {
    notFound();
  }

  const { data: company, error: companyError } = await getCompanyProfileById(session.company_id);

  if (companyError || !company) {
    console.error("Failed to fetch company:", companyError);
    notFound();
  }

  // 日程情報を取得
  const { data: dates } = await getSessionDates(id);

  // 場所テキストを生成
  const locationText = [session.location_type, session.location_detail]
    .filter(Boolean)
    .join(session.location_type && session.location_detail ? " / " : "");

  // 日程をフォーマット
  const formattedDates = dates?.map((date: any) => {
    const eventDate = new Date(date.event_date);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[eventDate.getDay()];
    const month = eventDate.getMonth() + 1;
    const day = eventDate.getDate();

    return {
      date: `${eventDate.getFullYear()}年${month}月${day}日 (${weekday})`,
      time: `${date.start_time} 〜 ${date.end_time}`,
      capacity: date.capacity || session.capacity || null
    };
  }) || [];

  if (!session.id) {
    notFound();
  }

  const sessionData = {
    id: session.id,
    title: session.title || "",
    type: session.type || "",
    dates: formattedDates,
    location: locationText || "",
    status: session.status === "active" ? ("受付中" as const) : ("終了" as const),
    description: session.description || "",
    capacity: session.capacity || null,
    companyName: company.name,
    companyLogo: company.logo_url || "",
    companyId: company.id,
    coverImage: session.cover_image_url || company.cover_image_url || undefined
  };

  return <SessionDetailView session={sessionData} />;
}
