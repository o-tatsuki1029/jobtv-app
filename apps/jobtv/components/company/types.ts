import type { Tables } from "@jobtv-app/shared/types";

type CompanyRow = Tables<"companies">;

export interface CompanyData {
  id: string;
  name: string;
  description: string;
  tagline?: string; // 見出し
  logo: string;
  coverImage: string;
  mainVideo?: string;
  industry: string;
  employees: string;
  prefecture?: string;
  addressLine1: string;
  addressLine2: string;
  representative: string;
  capital?: string;
  established: string;
  website: string;
  companyInfo: string;
  status?: "active" | "closed";
  snsUrls?: {
    x?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  programs: any[];
  shortVideos?: Array<{
    id: string;
    title: string;
    video: string;
    thumbnail?: string;
  }>;
  documentaryVideos?: Array<{
    id: string;
    title: string;
    video: string;
    thumbnail?: string;
  }>;
  benefits: string[];
  jobs: any[];
  events: any[];
}

/**
 * 企業プロフィール保存用のフォームデータ型
 */
export interface CompanyProfileFormData {
  description?: string;
  tagline?: string;
  logo_url?: string;
  cover_image_url?: string;
    industry?: string;
    employees?: string;
    address_line1?: string;
    address_line2?: string;
  representative?: string;
  capital?: string;
  established?: string;
  website?: string;
  sns_x_url?: string;
  sns_instagram_url?: string;
  sns_tiktok_url?: string;
  sns_youtube_url?: string;
  benefits?: string[];
}

/**
 * データベース型からCompanyData型に変換
 * companiesテーブルとcompany_pages_draftテーブル（またはcompany_pagesテーブル）のデータをマージ
 */
export function dbToCompanyData(
  dbCompany: CompanyRow & {
    // company_pages_draftテーブル（またはcompany_pagesテーブル）の項目（オプショナル）
    description?: string | null;
    tagline?: string | null;
    cover_image_url?: string | null;
    main_video_url?: string | null;
    sns_x_url?: string | null;
    sns_instagram_url?: string | null;
    sns_tiktok_url?: string | null;
    sns_youtube_url?: string | null;
    short_videos?: any;
    documentary_videos?: any;
    company_videos?: any;
    benefits?: string[] | null;
    // companiesテーブルの項目
    logo_url?: string | null;
    industry?: string | null;
    employees?: string | null;
    prefecture?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    representative?: string | null;
    established?: string | null;
    website?: string | null;
    job_postings?: Array<{
      id: string;
      title: string;
      location?: string | null;
      graduation_year: number;
      employment_type?: string | null;
      salary?: string | null;
      prefecture?: string | null;
      location_detail?: string | null;
      cover_image_url?: string | null;
    }>;
    videos?: Array<{
      id: string;
      title: string;
      video_url: string;
      thumbnail_url?: string | null;
      category: string;
      display_order: number;
      status: string;
    }>;
    sessions?: Array<{
      id: string;
      title: string;
      type?: string | null;
      location_type?: string | null;
      location_detail?: string | null;
      description?: string | null;
      graduation_year?: number | null;
      session_dates?: Array<{
        id: string;
        event_date: string;
        start_time: string;
        end_time: string;
        capacity?: number | null;
      }>;
    }>;
  }
): CompanyData {
  // JSONBから配列に変換
  const parseVideos = (videos: any): Array<{ id: string; title: string; video: string; thumbnail?: string }> => {
    if (!videos) return [];

    // 文字列の場合はJSON.parse
    let parsedVideos: any[] = [];
    if (typeof videos === "string") {
      try {
        parsedVideos = JSON.parse(videos);
      } catch (e) {
        console.error("Failed to parse videos JSON:", e);
        return [];
      }
    } else if (Array.isArray(videos)) {
      parsedVideos = videos;
    } else {
      return [];
    }

    return parsedVideos.map((v: any) => ({
      id: v.id || crypto.randomUUID(),
      title: v.title || "",
      video: v.video_url || v.video || "",
      thumbnail: v.thumbnail_url || v.thumbnail
    }));
  };

  // videosテーブルから取得した動画をカテゴリー別に分類
  // videosプロパティが存在する場合は、そのカテゴリーについてはvideosテーブルを優先する
  const videosByTable = dbCompany.videos;
  const hasVideosFromTable = videosByTable !== undefined;
  
  const mainVideoFromTable = videosByTable?.find((v) => v.category === "main");
  const shortVideosFromTable = videosByTable
    ?.filter((v) => v.category === "short")
    .map((v) => ({
      id: v.id,
      title: v.title,
      video: v.video_url,
      thumbnail: v.thumbnail_url || undefined
    }));
  const documentaryVideosFromTable = videosByTable
    ?.filter((v) => v.category === "documentary")
    .map((v) => ({
      id: v.id,
      title: v.title,
      video: v.video_url,
      thumbnail: v.thumbnail_url || undefined
    }));

  return {
    id: dbCompany.id,
    name: dbCompany.name,
    description: dbCompany.description || "",
    tagline: dbCompany.tagline || undefined,
    logo: dbCompany.logo_url || "",
    coverImage: dbCompany.cover_image_url || "",
    mainVideo: hasVideosFromTable 
      ? (mainVideoFromTable?.video_url || undefined) 
      : (dbCompany.main_video_url || undefined),
    industry: dbCompany.industry || "",
    employees: dbCompany.employees || "",
    prefecture: (dbCompany as any).prefecture || "",
    addressLine1: (dbCompany as any).address_line1 || "",
    addressLine2: (dbCompany as any).address_line2 || "",
    representative: dbCompany.representative || "",
    established: dbCompany.established || "",
    website: dbCompany.website || "",
    companyInfo: (dbCompany as any).company_info || "",
    status: (dbCompany as any).status || "active",
    snsUrls: {
      x: dbCompany.sns_x_url || undefined,
      instagram: dbCompany.sns_instagram_url || undefined,
      tiktok: dbCompany.sns_tiktok_url || undefined,
      youtube: dbCompany.sns_youtube_url || undefined
    },
    benefits: dbCompany.benefits || [],
    programs: [],
    shortVideos: hasVideosFromTable 
      ? (shortVideosFromTable || []) 
      : parseVideos(dbCompany.short_videos),
    documentaryVideos: hasVideosFromTable 
      ? (documentaryVideosFromTable || []) 
      : parseVideos(dbCompany.documentary_videos),
    jobs: (dbCompany.job_postings || []).map((job) => {
      // 都道府県と詳細を組み合わせてlocationを作成
      const locationText = [job.prefecture, job.location_detail]
        .filter(Boolean)
        .join(job.prefecture && job.location_detail ? " " : "");
      return {
        id: job.id,
        title: job.title,
        location: locationText || "",
        graduationYear: `${job.graduation_year}年卒`,
        coverImage: job.cover_image_url || undefined,
        prefecture: job.prefecture || undefined,
        employmentType: job.employment_type || undefined
      };
    }),
    events: (dbCompany.sessions || []).map((session) => {
      // 最も近い日程を取得
      const sortedDates = (session.session_dates || [])
        .filter((d) => d.event_date)
        .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
      const nextDate = sortedDates[0];

      // 日付をフォーマット
      let dateStr = "";
      if (nextDate) {
        const eventDate = new Date(nextDate.event_date);
        const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
        const dayName = dayNames[eventDate.getDay()];
        const year = eventDate.getFullYear();
        const month = eventDate.getMonth() + 1;
        const day = eventDate.getDate();
        dateStr = `${year}年${month}月${day}日 (${dayName}) ${nextDate.start_time?.slice(0, 5) || ""}〜`;
      }

      // 場所を組み立て
      const locationParts = [session.location_type, session.location_detail].filter(Boolean);
      const locationStr = locationParts.join(" / ");

      return {
        id: session.id,
        title: session.title,
        date: dateStr,
        location: locationStr,
        type: session.type || "説明会",
        status: "受付中", // 公開されている説明会は受付中として表示
        coverImage: (session as any).cover_image_url || undefined,
        description: session.description || undefined,
        graduationYear: session.graduation_year || undefined,
        locationType: session.location_type || undefined
      };
    })
  };
}

/**
 * このページで編集可能な項目のみをフォームデータに変換
 * UIに表示されている項目のみを保存対象とする（company_pagesテーブル用）
 */
export function companyDataToFormDataForPage(
  companyData: Partial<CompanyData>,
  snsUrls: CompanyData["snsUrls"]
): CompanyProfileFormData {
  return {
    // UIに表示されている項目のみ（company_pagesテーブル用）
    description: companyData.description,
    tagline: companyData.tagline,
    cover_image_url: companyData.coverImage,
    sns_x_url: snsUrls?.x,
    sns_instagram_url: snsUrls?.instagram,
    sns_tiktok_url: snsUrls?.tiktok,
    sns_youtube_url: snsUrls?.youtube,
    benefits: companyData.benefits?.filter((benefit) => benefit.trim() !== "")
    // 以下の項目は意図的に除外（companiesテーブルで管理されるため）
    // logo_url, industry, employees, location, address,
    // representative, capital, established, website
    // 動画関連も除外（/studio/videosで管理）
  };
}

/**
 * CompanyData型からCompanyProfileFormData型に変換
 */
export function companyDataToFormData(companyData: Partial<CompanyData>): CompanyProfileFormData {
  return {
    description: companyData.description,
    tagline: companyData.tagline,
    logo_url: companyData.logo,
    cover_image_url: companyData.coverImage,
    industry: companyData.industry,
    employees: companyData.employees,
    representative: companyData.representative,
    capital: companyData.capital,
    established: companyData.established,
    website: companyData.website,
    sns_x_url: companyData.snsUrls?.x,
    sns_instagram_url: companyData.snsUrls?.instagram,
    sns_tiktok_url: companyData.snsUrls?.tiktok,
    sns_youtube_url: companyData.snsUrls?.youtube,
    benefits: companyData.benefits?.filter((benefit) => benefit.trim() !== "")
  };
}

/**
 * CompanyData型からデータベース型に変換（非推奨: companyDataToFormDataを使用）
 */
export function companyDataToDb(companyData: Partial<CompanyData>): Partial<CompanyRow> & {
  description?: string | null;
  tagline?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  main_video_url?: string | null;
    industry?: string | null;
    employees?: string | null;
    representative?: string | null;
  capital?: string | null;
  established?: string | null;
  website?: string | null;
  sns_x_url?: string | null;
  sns_instagram_url?: string | null;
  sns_tiktok_url?: string | null;
  sns_youtube_url?: string | null;
  benefits?: string[] | null;
} {
  return {
    name: companyData.name,
    description: companyData.description,
    tagline: companyData.tagline,
    logo_url: companyData.logo,
    cover_image_url: companyData.coverImage,
    main_video_url: companyData.mainVideo,
    industry: companyData.industry,
    employees: companyData.employees,
    representative: companyData.representative,
    capital: companyData.capital,
    established: companyData.established,
    website: companyData.website,
    sns_x_url: companyData.snsUrls?.x,
    sns_instagram_url: companyData.snsUrls?.instagram,
    sns_tiktok_url: companyData.snsUrls?.tiktok,
    sns_youtube_url: companyData.snsUrls?.youtube,
    benefits: companyData.benefits
  };
}
