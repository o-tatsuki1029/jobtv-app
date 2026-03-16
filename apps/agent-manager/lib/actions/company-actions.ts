"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { insertRecord, updateRecord, queryTable } from "./supabase-actions";
import type { Tables, TablesInsert } from "@jobtv-app/shared/types";

export type Company = Tables<"companies">;
export type CompanyInsert = Partial<TablesInsert<"companies">>;
// 後方互換性のためのエイリアス
export type CompanyData = Company;

/**
 * 企業一覧を取得
 */
export async function getCompanies(): Promise<{
  data: Company[] | null;
  error: string | null;
}> {
  const result = await queryTable("companies", {
    select: "*",
    order: { column: "created_at", ascending: false },
  });
  return result as { data: Company[] | null; error: string | null };
}

/**
 * 単一の企業を取得
 */
export async function getCompany(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error({ action: "getCompany", err: error, companyId: id }, "企業の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data as Company, error: null };
}

/**
 * 企業の求人一覧を取得
 */
export async function getCompanyJobs(companyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("job_postings")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getCompanyJobs", err: error, companyId }, "企業の求人一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}

/**
 * 企業を作成
 */
export async function createCompany(data: CompanyInsert) {
  const result = await insertRecord<Company>("companies", data, ["/admin/companies"]);

  if (!result.error && result.data) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({
        userId: user.id,
        action: "company.create",
        category: "account",
        resourceType: "companies",
        resourceId: (result.data as Company).id,
        app: "agent-manager",
        metadata: { name: (result.data as Company).name },
      });
    }
  }

  return result;
}

/**
 * 企業を更新
 */
export async function updateCompany(id: string, data: CompanyInsert) {
  const result = await updateRecord<Company>("companies", id, data, ["/admin/companies"]);

  if (!result.error) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({
        userId: user.id,
        action: "company.update",
        category: "account",
        resourceType: "companies",
        resourceId: id,
        app: "agent-manager",
        metadata: { companyId: id },
      });
    }
  }

  return result;
}
