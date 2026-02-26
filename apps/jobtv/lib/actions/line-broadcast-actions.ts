"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-auth";

/** セグメント条件（すべてオプション。指定した条件で AND 絞り込み） */
export interface LineBroadcastFilters {
  graduation_years?: number[];
  desired_industries?: string[];
  desired_job_types?: string[];
  school_type?: string;
  major_field?: string;
}

/**
 * セグメント条件に該当し、かつ LINE 連携済みの候補者件数を返す。Admin 専用。
 */
export async function getLineBroadcastEligibleCount(
  filters: LineBroadcastFilters
): Promise<{ data: number; error: null } | { data: null; error: string }> {
  try {
    await requireAdmin();
  } catch {
    return { data: null, error: "管理者権限が必要です。" };
  }

  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("candidates")
      .select("id", { count: "exact", head: true })
      .not("line_user_id", "is", null);

    if (filters.graduation_years?.length) {
      q = q.in("graduation_year", filters.graduation_years);
    }
    if (filters.desired_industries?.length) {
      q = q.overlaps("desired_industry", filters.desired_industries);
    }
    if (filters.desired_job_types?.length) {
      q = q.overlaps("desired_job_type", filters.desired_job_types);
    }
    if (filters.school_type != null && filters.school_type !== "") {
      q = q.eq("school_type", filters.school_type);
    }
    if (filters.major_field != null && filters.major_field !== "") {
      q = q.eq("major_field", filters.major_field);
    }

    const { count, error } = await q;

    if (error) {
      console.error("getLineBroadcastEligibleCount error:", error);
      return { data: null, error: "対象件数の取得に失敗しました。" };
    }

    return { data: count ?? 0, error: null };
  } catch (e) {
    console.error("getLineBroadcastEligibleCount error:", e);
    return { data: null, error: "対象件数の取得に失敗しました。" };
  }
}

const LINE_PUSH_DELAY_MS = 50;

/**
 * セグメント条件に該当する LINE 連携済み候補者にテキストをプッシュ配信する。Admin 専用。
 */
export async function sendLineBroadcast(
  filters: LineBroadcastFilters,
  messageText: string
): Promise<
  | { data: { sent: number; failed: number }; error: null }
  | { data: null; error: string }
> {
  try {
    await requireAdmin();
  } catch {
    return { data: null, error: "管理者権限が必要です。" };
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN is not set");
    return { data: null, error: "LINE 配信の設定がありません。" };
  }

  const text = messageText.trim();
  if (!text) {
    return { data: null, error: "配信文を入力してください。" };
  }

  try {
    const supabase = createAdminClient();
    let q = supabase
      .from("candidates")
      .select("id, line_user_id")
      .not("line_user_id", "is", null);

    if (filters.graduation_years?.length) {
      q = q.in("graduation_year", filters.graduation_years);
    }
    if (filters.desired_industries?.length) {
      q = q.overlaps("desired_industry", filters.desired_industries);
    }
    if (filters.desired_job_types?.length) {
      q = q.overlaps("desired_job_type", filters.desired_job_types);
    }
    if (filters.school_type != null && filters.school_type !== "") {
      q = q.eq("school_type", filters.school_type);
    }
    if (filters.major_field != null && filters.major_field !== "") {
      q = q.eq("major_field", filters.major_field);
    }

    const { data: rows, error } = await q;

    if (error) {
      console.error("sendLineBroadcast select error:", error);
      return { data: null, error: "配信対象の取得に失敗しました。" };
    }

    const targets = (rows ?? []).filter((r): r is { id: string; line_user_id: string } => r.line_user_id != null);
    let sent = 0;
    let failed = 0;

    for (const row of targets) {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          to: row.line_user_id,
          messages: [{ type: "text", text }]
        })
      });

      if (res.ok) {
        sent++;
      } else {
        failed++;
        const errBody = await res.text();
        console.error("LINE push error for", row.id, res.status, errBody);
      }

      if (LINE_PUSH_DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, LINE_PUSH_DELAY_MS));
      }
    }

    return { data: { sent, failed }, error: null };
  } catch (e) {
    console.error("sendLineBroadcast error:", e);
    return { data: null, error: "配信の実行に失敗しました。" };
  }
}
