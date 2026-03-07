// エントリー・予約通知メール送信ヘルパー
// Server Actions から fire-and-forget で呼び出す

import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedEmail } from "./send-templated-email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobtv.jp";

function formatJstDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 求人エントリー通知を企業リクルーター全員に送信する。
 * エラーが起きても例外を投げない（呼び出し元の処理と切り離す）。
 */
export async function sendJobApplicationNotification(
  jobPostingIds: string[],
  candidateId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // 求人タイトルと company_id を取得
    const { data: jobs, error: jobsError } = await supabase
      .from("job_postings")
      .select("id, title, company_id")
      .in("id", jobPostingIds);

    if (jobsError || !jobs || jobs.length === 0) {
      console.error("[sendJobApplicationNotification] 求人取得エラー:", jobsError);
      return;
    }

    // 候補者名を取得
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("last_name, first_name")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error("[sendJobApplicationNotification] 候補者取得エラー:", candidateError);
      return;
    }

    const candidateName = `${candidate.last_name} ${candidate.first_name}`;
    const appliedAt = formatJstDateTime(new Date().toISOString());

    // company_id でグルーピング
    const byCompany = new Map<string, { title: string }[]>();
    for (const job of jobs) {
      if (!byCompany.has(job.company_id)) byCompany.set(job.company_id, []);
      byCompany.get(job.company_id)!.push({ title: job.title });
    }

    for (const [companyId, companyJobs] of byCompany) {
      // 企業名を取得
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("name")
        .eq("id", companyId)
        .single();

      if (companyError || !company) {
        console.error("[sendJobApplicationNotification] 企業取得エラー:", companyError);
        continue;
      }

      // リクルーターのメール一覧を取得
      const { data: recruiters, error: recruitersError } = await supabase
        .from("profiles")
        .select("email")
        .eq("role", "recruiter")
        .eq("company_id", companyId)
        .not("email", "is", null);

      if (recruitersError) {
        console.error("[sendJobApplicationNotification] リクルーター取得エラー:", recruitersError);
        continue;
      }

      if (!recruiters || recruiters.length === 0) continue;

      const jobTitles = companyJobs.map((j) => `・${j.title}`).join("\n");

      for (const recruiter of recruiters) {
        if (!recruiter.email) continue;
        await sendTemplatedEmail({
          templateName: "job_application_notification",
          recipientEmail: recruiter.email,
          variables: {
            company_name: company.name,
            candidate_name: candidateName,
            job_titles: jobTitles,
            applied_at: appliedAt,
            site_url: SITE_URL,
          },
        });
      }
    }
  } catch (err) {
    console.error("[sendJobApplicationNotification] 予期しないエラー:", err);
  }
}

/**
 * 説明会予約通知を企業リクルーター全員に送信する。
 * エラーが起きても例外を投げない（呼び出し元の処理と切り離す）。
 */
export async function sendSessionReservationNotification(
  sessionDateId: string,
  candidateId: string
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // 日程・説明会情報を取得
    const { data: sessionDate, error: sessionDateError } = await supabase
      .from("session_dates")
      .select("event_date, start_time, end_time, session_id, sessions(title, company_id)")
      .eq("id", sessionDateId)
      .single();

    if (sessionDateError || !sessionDate) {
      console.error("[sendSessionReservationNotification] 日程取得エラー:", sessionDateError);
      return;
    }

    const session = Array.isArray(sessionDate.sessions)
      ? sessionDate.sessions[0]
      : sessionDate.sessions;

    if (!session?.company_id || !session?.title) {
      console.error("[sendSessionReservationNotification] 説明会情報が不完全です");
      return;
    }

    // 候補者名を取得
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("last_name, first_name")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error("[sendSessionReservationNotification] 候補者取得エラー:", candidateError);
      return;
    }

    // 企業名を取得
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", session.company_id)
      .single();

    if (companyError || !company) {
      console.error("[sendSessionReservationNotification] 企業取得エラー:", companyError);
      return;
    }

    // リクルーターのメール一覧を取得
    const { data: recruiters, error: recruitersError } = await supabase
      .from("profiles")
      .select("email")
      .eq("role", "recruiter")
      .eq("company_id", session.company_id)
      .not("email", "is", null);

    if (recruitersError || !recruiters || recruiters.length === 0) {
      console.error("[sendSessionReservationNotification] リクルーター取得エラー:", recruitersError);
      return;
    }

    const candidateName = `${candidate.last_name} ${candidate.first_name}`;
    const reservedAt = formatJstDateTime(new Date().toISOString());

    for (const recruiter of recruiters) {
      if (!recruiter.email) continue;
      await sendTemplatedEmail({
        templateName: "session_reservation_notification",
        recipientEmail: recruiter.email,
        variables: {
          company_name: company.name,
          candidate_name: candidateName,
          session_title: session.title,
          event_date: sessionDate.event_date,
          start_time: sessionDate.start_time,
          end_time: sessionDate.end_time,
          reserved_at: reservedAt,
          site_url: SITE_URL,
        },
      });
    }
  } catch (err) {
    console.error("[sendSessionReservationNotification] 予期しないエラー:", err);
  }
}
