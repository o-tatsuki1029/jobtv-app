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
 */
export async function getCompaniesByIndustry(): Promise<{
  data: Map<string, CompanyWithPage[]> | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // まず、status='active'のcompany_pagesからcompany_idを取得
    const { data: activePages, error: pagesError } = await supabase
      .from("company_pages")
      .select("company_id")
      .eq("status", "active");

    if (pagesError) {
      logger.error({ action: "getCompaniesByIndustry", err: pagesError }, "アクティブな企業ページの取得に失敗");
      return { data: null, error: pagesError.message };
    }

    if (!activePages || activePages.length === 0) {
      return { data: new Map(), error: null };
    }

    // アクティブな企業IDのリストを作成
    const activeCompanyIds = activePages.map((page) => page.company_id);

    // アクティブな企業IDに該当するcompaniesを取得
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("*")
      .in("id", activeCompanyIds)
      .order("updated_at", { ascending: false });

    if (companiesError) {
      logger.error({ action: "getCompaniesByIndustry", err: companiesError }, "業界別企業一覧の取得に失敗");
      return { data: null, error: companiesError.message };
    }

    if (!companies || companies.length === 0) {
      return { data: new Map(), error: null };
    }

    // 企業ページ情報を一括取得
    const { data: companyPages, error: companyPagesError } = await supabase
      .from("company_pages")
      .select("*")
      .in("company_id", activeCompanyIds)
      .eq("status", "active");

    if (companyPagesError) {
      logger.error({ action: "getCompaniesByIndustry", err: companyPagesError }, "企業ページ情報の取得に失敗");
      // エラーでも企業情報は返す
    }

    // company_idをキーにしたMapを作成
    const companyPageMap = new Map<string, CompanyPageRow>();
    if (companyPages) {
      for (const page of companyPages) {
        companyPageMap.set(page.company_id, page);
      }
    }

    // データをCompanyWithPage型に変換
    const companiesWithPage: CompanyWithPage[] = companies.map((company) => ({
      ...company,
      company_page: companyPageMap.get(company.id) || null
    }));

    // 業界ごとにグループ化
    const companiesByIndustry = new Map<string, CompanyWithPage[]>();

    for (const company of companiesWithPage) {
      // 業界がnullの場合は「その他」として扱う
      const industry = company.industry || "その他";

      if (!companiesByIndustry.has(industry)) {
        companiesByIndustry.set(industry, []);
      }

      companiesByIndustry.get(industry)!.push(company);
    }

    // 各業界の企業をupdated_atの降順でソート（既にソート済みだが念のため）
    for (const [industry, companies] of companiesByIndustry.entries()) {
      companies.sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateB - dateA; // 降順
      });
    }

    return { data: companiesByIndustry, error: null };
  } catch (error) {
    logger.error({ action: "getCompaniesByIndustry", err: error }, "業界別企業一覧の取得に失敗");
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業一覧の取得に失敗しました"
    };
  }
}

