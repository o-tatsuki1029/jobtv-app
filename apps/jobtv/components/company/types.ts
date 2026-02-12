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
  location: string;
  address: string;
  addressLine1: string;
  addressLine2: string;
  representative: string;
  capital?: string;
  established: string;
  website: string;
  companyInfo: string;
  status?: "pending" | "active" | "closed";
  snsUrls?: {
    x?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  programs: any[];
  shortVideos: Array<{
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
  main_video_url?: string;
  industry?: string;
  employees?: string;
  location?: string;
  address?: string;
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
  short_videos?: Array<{
    id: string;
    title: string;
    video_url: string;
    thumbnail_url?: string;
  }>;
  documentary_videos?: Array<{
    id: string;
    title: string;
    video_url: string;
    thumbnail_url?: string;
  }>;
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
    location?: string | null;
    address?: string | null;
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

  return {
    id: dbCompany.id,
    name: dbCompany.name,
    description: dbCompany.description || "",
    tagline: dbCompany.tagline || undefined,
    logo: dbCompany.logo_url || "",
    coverImage: dbCompany.cover_image_url || "",
    mainVideo: dbCompany.main_video_url || undefined,
    industry: dbCompany.industry || "",
    employees: dbCompany.employees || "",
    location: dbCompany.location || "",
    address: dbCompany.address || "",
    addressLine1: (dbCompany as any).address_line1 || "",
    addressLine2: (dbCompany as any).address_line2 || "",
    representative: dbCompany.representative || "",
    established: dbCompany.established || "",
    website: dbCompany.website || "",
    companyInfo: (dbCompany as any).company_info || "",
    status: (dbCompany as any).status || "pending",
    snsUrls: {
      x: dbCompany.sns_x_url || undefined,
      instagram: dbCompany.sns_instagram_url || undefined,
      tiktok: dbCompany.sns_tiktok_url || undefined,
      youtube: dbCompany.sns_youtube_url || undefined
    },
    benefits: dbCompany.benefits || [],
    programs: [],
    shortVideos: parseVideos(dbCompany.short_videos),
    documentaryVideos: parseVideos(dbCompany.documentary_videos),
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
        coverImage: job.cover_image_url || undefined
      };
    }),
    events: []
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
    main_video_url: companyData.mainVideo,
    sns_x_url: snsUrls?.x,
    sns_instagram_url: snsUrls?.instagram,
    sns_tiktok_url: snsUrls?.tiktok,
    sns_youtube_url: snsUrls?.youtube,
    short_videos: companyData.shortVideos?.map((v) => ({
      id: v.id,
      title: v.title,
      video_url: v.video,
      thumbnail_url: v.thumbnail
    })),
    documentary_videos: companyData.documentaryVideos?.map((v) => ({
      id: v.id,
      title: v.title,
      video_url: v.video,
      thumbnail_url: v.thumbnail
    })),
    benefits: companyData.benefits?.filter((benefit) => benefit.trim() !== "")
    // 以下の項目は意図的に除外（companiesテーブルで管理されるため）
    // logo_url, industry, employees, location, address,
    // representative, capital, established, website
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
    main_video_url: companyData.mainVideo,
    industry: companyData.industry,
    employees: companyData.employees,
    location: companyData.location,
    address: companyData.address,
    representative: companyData.representative,
    capital: companyData.capital,
    established: companyData.established,
    website: companyData.website,
    sns_x_url: companyData.snsUrls?.x,
    sns_instagram_url: companyData.snsUrls?.instagram,
    sns_tiktok_url: companyData.snsUrls?.tiktok,
    sns_youtube_url: companyData.snsUrls?.youtube,
    short_videos: companyData.shortVideos?.map((v) => ({
      id: v.id,
      title: v.title,
      video_url: v.video,
      thumbnail_url: v.thumbnail
    })),
    documentary_videos: companyData.documentaryVideos?.map((v) => ({
      id: v.id,
      title: v.title,
      video_url: v.video,
      thumbnail_url: v.thumbnail
    })),
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
  location?: string | null;
  address?: string | null;
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
    location: companyData.location,
    address: companyData.address,
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
