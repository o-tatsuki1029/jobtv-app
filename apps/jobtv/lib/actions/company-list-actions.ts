"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@jobtv-app/shared/types";
import { logger } from "@/lib/logger";

type CompanyRow = Tables<"companies">;
type CompanyPageRow = Tables<"company_pages">;

/**
 * 企業と企業ページ情報の結合型
 */
export type CompanyWithPage = CompanyRow & {
  company_page?: CompanyPageRow | null;
};

/**
 * 業界ごとに企業をグループ化して取得
 * company_pages.status = 'active'の企業のみを取得
 * companies.updated_atの降順でソート
 * 業界がnullの企業は「その他」として扱う
 *
 * @param limitPerIndustry 業界あたりの取得件数上限（未指定時は全件）
 */
export async function getCompaniesByIndustry(limitPerIndustry?: number): Promise<{
  data: Map<string, CompanyWithPage[]> | null;
  /** 業界ごとの総件数（limitPerIndustry 指定時のみ意味がある） */
  totalCounts: Map<string, number> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // company_pages（active）を内部結合で企業と一緒に取得
    const { data: companiesWithPages, error } = await supabase
      .from("companies")
      .select("*, company_pages!inner(*)")
      .eq("company_pages.status", "active")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true });

    if (error) {
      logger.error({ action: "getCompaniesByIndustry", err: error }, "業界別企業一覧の取得に失敗");
      return { data: null, totalCounts: null, error: error.message };
    }

    if (!companiesWithPages || companiesWithPages.length === 0) {
      return { data: new Map(), totalCounts: new Map(), error: null };
    }

    // データをCompanyWithPage型に変換し、業界ごとにグループ化
    const companiesByIndustry = new Map<string, CompanyWithPage[]>();

    for (const row of companiesWithPages) {
      const { company_pages, ...company } = row;
      const page = Array.isArray(company_pages) ? company_pages[0] : company_pages;
      const companyWithPage: CompanyWithPage = {
        ...company,
        company_page: page || null,
      };

      const industry = company.industry || "その他";
      if (!companiesByIndustry.has(industry)) {
        companiesByIndustry.set(industry, []);
      }
      companiesByIndustry.get(industry)!.push(companyWithPage);
    }

    // 総件数を記録してから limit を適用
    const totalCounts = new Map<string, number>();
    for (const [industry, companies] of companiesByIndustry) {
      totalCounts.set(industry, companies.length);
    }

    if (limitPerIndustry !== undefined) {
      for (const [industry, companies] of companiesByIndustry) {
        companiesByIndustry.set(industry, companies.slice(0, limitPerIndustry));
      }
    }

    return { data: companiesByIndustry, totalCounts, error: null };
  } catch (error) {
    logger.error({ action: "getCompaniesByIndustry", err: error }, "業界別企業一覧の取得に失敗");
    return {
      data: null,
      totalCounts: null,
      error: error instanceof Error ? error.message : "企業一覧の取得に失敗しました"
    };
  }
}

/** Client Component 向け: 業界別に初回10件 + 総件数を返す（Map ではなく plain object） */
export async function getCompaniesByIndustryForTopPage(
  limitPerIndustry: number
): Promise<{
  data: Record<string, { companies: Array<{ id: string; name: string; logo_url: string | null; thumbnail_url: string | null }>; totalCount: number }>;
  error: string | null;
}> {
  const result = await getCompaniesByIndustry(limitPerIndustry);
  if (result.error || !result.data) {
    return { data: {}, error: result.error };
  }

  const data: Record<string, { companies: Array<{ id: string; name: string; logo_url: string | null; thumbnail_url: string | null }>; totalCount: number }> = {};
  for (const [industry, companies] of result.data) {
    data[industry] = {
      companies: companies.map((c) => ({
        id: c.id,
        name: c.name ?? "",
        logo_url: c.logo_url ?? null,
        thumbnail_url: c.thumbnail_url ?? null,
      })),
      totalCount: result.totalCounts?.get(industry) ?? companies.length,
    };
  }

  return { data, error: null };
}

/**
 * 特定の業界の企業を offset / limit で取得
 * 「もっと見る」で追加読み込みする用途
 */
export async function getCompaniesByIndustryPaginated(
  industry: string,
  offset: number,
  limit: number
): Promise<{
  data: Array<{ id: string; name: string; logo_url: string | null; thumbnail_url: string | null }> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: companiesWithPages, error } = await supabase
      .from("companies")
      .select("id, name, logo_url, thumbnail_url, company_pages!inner(status)")
      .eq("company_pages.status", "active")
      .eq("industry", industry)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ action: "getCompaniesByIndustryPaginated", err: error }, "業界別企業追加取得に失敗");
      return { data: null, error: error.message };
    }

    const companies = (companiesWithPages ?? []).map((row) => ({
      id: row.id,
      name: row.name ?? "",
      logo_url: row.logo_url ?? null,
      thumbnail_url: row.thumbnail_url ?? null,
    }));

    return { data: companies, error: null };
  } catch (error) {
    logger.error({ action: "getCompaniesByIndustryPaginated", err: error }, "業界別企業追加取得に失敗");
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業の追加取得に失敗しました"
    };
  }
}

/**
 * 動画（videos）が存在する業界名のセットを返す
 * companies と videos を inner join し、動画を持つ企業の industry を取得
 */
export async function getIndustriesWithVideos(): Promise<{
  data: Set<string> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("companies")
      .select("industry, videos!inner(id)")
      .eq("videos.status", "active");

    if (error) {
      logger.error({ action: "getIndustriesWithVideos", err: error }, "動画あり業界の取得に失敗");
      return { data: null, error: error.message };
    }

    const industries = new Set<string>();
    for (const row of data ?? []) {
      if (row.industry) {
        industries.add(row.industry);
      }
    }

    return { data: industries, error: null };
  } catch (error) {
    logger.error({ action: "getIndustriesWithVideos", err: error }, "動画あり業界の取得に失敗");
    return {
      data: null,
      error: error instanceof Error ? error.message : "動画あり業界の取得に失敗しました"
    };
  }
}
