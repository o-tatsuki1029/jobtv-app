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
  representative: string;
  capital: string;
  established: string;
  website: string;
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
 */
export function dbToCompanyData(
  dbCompany: CompanyRow & {
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
    short_videos?: any;
    documentary_videos?: any;
    benefits?: string[] | null;
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
    representative: dbCompany.representative || "",
    capital: dbCompany.capital || "",
    established: dbCompany.established || "",
    website: dbCompany.website || "",
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
    jobs: [],
    events: []
  };
}

/**
 * CompanyData型からデータベース型に変換
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
  message_title?: string | null;
  message_content?: string | null;
  message_image_url?: string | null;
  message_author?: string | null;
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
