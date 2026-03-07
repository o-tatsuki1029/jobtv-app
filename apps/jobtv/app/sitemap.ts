import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";
import { createClient } from "@/lib/supabase/server";

/**
 * 公開ページのサイトマップを生成（クロール効率化のため動的URLを追加）
 * トップ + 企業・説明会・求人詳細（status=active のみ）
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: `${SITE_URL}/docs/terms`,
      lastModified: new Date("2022-12-01"),
      changeFrequency: "yearly",
      priority: 0.3
    }
  ];

  try {
    const supabase = await createClient();

    const [companyPages, sessions, jobs] = await Promise.all([
      supabase
        .from("company_pages")
        .select("company_id, updated_at")
        .eq("status", "active"),
      supabase
        .from("sessions")
        .select("id, updated_at")
        .eq("status", "active"),
      supabase
        .from("job_postings")
        .select("id, updated_at")
        .eq("status", "active")
    ]);

    const companyUrls: MetadataRoute.Sitemap = (companyPages.data ?? []).map(
      (row) => ({
        url: `${SITE_URL}/company/${row.company_id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8
      })
    );
    const sessionUrls: MetadataRoute.Sitemap = (sessions.data ?? []).map(
      (row) => ({
        url: `${SITE_URL}/session/${row.id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.8
      })
    );
    const jobUrls: MetadataRoute.Sitemap = (jobs.data ?? []).map((row) => ({
      url: `${SITE_URL}/job/${row.id}`,
      lastModified: row.updated_at ? new Date(row.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8
    }));

    return [...base, ...companyUrls, ...sessionUrls, ...jobUrls];
  } catch (e) {
    console.error("Sitemap generation error:", e);
    return base;
  }
}
