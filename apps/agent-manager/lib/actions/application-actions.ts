"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * 応募一覧を取得
 */
export async function getApplications() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("applications")
    .select(
      `
      *,
      candidates (
        id,
        full_name,
        email
      ),
      job_postings (
        id,
        title,
        companies (
          id,
          name
        )
      )
    `
    )
    .order("applied_at", { ascending: false });

  if (error) {
    logger.error({ action: "getApplications", err: error }, "応募一覧の取得に失敗しました");
    return { data: null, error: error.message };
  }

  return { data: data || [], error: null };
}
