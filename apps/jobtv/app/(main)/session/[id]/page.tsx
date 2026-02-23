import SessionDetailView from "@/components/SessionDetailView";
import SessionEventJsonLd from "@/components/seo/SessionEventJsonLd";
import { getSession, getSessionDates } from "@/lib/actions/session-actions";
import { getSessionDateReservationCounts } from "@/lib/actions/session-reservation-actions";
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

  // 日程情報を取得（今日以降のみ表示、過去は「過去の日程を見る」で取得）
  const { data: dates } = await getSessionDates(id);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const allDates = dates || [];
  const upcomingDates = allDates.filter((d: { event_date: string }) => d.event_date >= todayStr);
  const hasPastDates = allDates.some((d: { event_date: string }) => d.event_date < todayStr);

  // 今日以降の日程のみ予約数取得・フォーマット
  const upcomingIds = upcomingDates.map((d: { id: string }) => d.id);
  const { data: reservationCounts } = await getSessionDateReservationCounts(upcomingIds);
  const counts = reservationCounts || {};

  const locationText = [session.location_type, session.location_detail]
    .filter(Boolean)
    .join(session.location_type && session.location_detail ? " / " : "");

  const formattedDates = [...upcomingDates]
    .sort((a: { event_date: string }, b: { event_date: string }) => a.event_date.localeCompare(b.event_date))
    .map((date: any) => {
      const eventDate = new Date(date.event_date);
      const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
      const weekday = weekdays[eventDate.getDay()];
      const month = eventDate.getMonth() + 1;
      const day = eventDate.getDate();
      const formatTime = (time: string) => (time ? time.slice(0, 5) : "");
      const capacity = date.capacity ?? session.capacity ?? null;
      const reserved = counts[date.id] ?? 0;
      const isFull = capacity != null && reserved >= capacity;
      const status: "受付中" | "満員" | "実施済み" = isFull ? "満員" : "受付中";

      return {
        id: date.id,
        date: `${eventDate.getFullYear()}年${month}月${day}日 (${weekday})`,
        time: `${formatTime(date.start_time)} 〜 ${formatTime(date.end_time)}`,
        capacity,
        isPast: false,
        status
      };
    });

  if (!session.id) {
    notFound();
  }

  // 企業ページ情報からカバー画像を取得
  const companyCoverImage = (company as any).cover_image_url || null;
  // companiesテーブルのIDを確実に使用（company_pagesのidで上書きされないように）
  const companyId = session.company_id || company.id;

  const sessionData = {
    id: session.id,
    title: session.title || "",
    type: session.type || "",
    dates: formattedDates,
    hasPastDates,
    location: locationText || "",
    status: session.status === "active" ? ("受付中" as const) : ("終了" as const),
    description: session.description || "",
    capacity: session.capacity || null,
    companyName: company.name,
    companyLogo: company.logo_url || "",
    companyId: companyId,
    coverImage: session.cover_image_url || companyCoverImage || undefined,
    graduationYear: session.graduation_year || undefined,
    locationType: session.location_type || undefined,
    locationDetail: session.location_detail || undefined,
    companyIndustry: company.industry || undefined,
    companyEmployees: company.employees || undefined,
    companyPrefecture: company.prefecture || undefined,
    companyEstablished: company.established || undefined,
    companyRepresentative: company.representative || undefined,
    companyWebsite: company.website || undefined,
    companyAddressLine1: company.address_line1 || undefined,
    companyAddressLine2: company.address_line2 || undefined,
    companyBenefits: Array.isArray((company as any).benefits) ? (company as any).benefits : undefined
  };

  const firstUpcomingDate = upcomingDates[0] as
    | { event_date: string; start_time: string | null; end_time: string | null }
    | undefined;

  return (
    <>
      <SessionEventJsonLd
        session={session}
        company={company}
        firstDate={firstUpcomingDate}
      />
      <SessionDetailView session={sessionData} />
    </>
  );
}
