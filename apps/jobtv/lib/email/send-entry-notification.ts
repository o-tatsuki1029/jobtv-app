// エントリー・予約通知メール送信ヘルパー
// Server Actions から fire-and-forget で呼び出す

import { logger } from "@/lib/logger";
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
      logger.error({ action: "sendJobApplicationNotification", err: jobsError, jobPostingIds }, "求人の取得に失敗しました");
      return;
    }

    // 候補者名を取得（名前は profiles に集約）
    const { data: candidateProfile, error: candidateProfileError } = await supabase
      .from("profiles")
      .select("last_name, first_name")
      .eq("candidate_id", candidateId)
      .single();

    if (candidateProfileError || !candidateProfile) {
      logger.error({ action: "sendJobApplicationNotification", err: candidateProfileError, candidateId }, "候補者プロフィールの取得に失敗しました");
      return;
    }

    const candidateName = `${candidateProfile.last_name} ${candidateProfile.first_name}`;
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
        logger.error({ action: "sendJobApplicationNotification", err: companyError, companyId }, "企業情報の取得に失敗しました");
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
        logger.error({ action: "sendJobApplicationNotification", err: recruitersError, companyId }, "リクルーターの取得に失敗しました");
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
    logger.error({ action: "sendJobApplicationNotification", err }, "予期しないエラーが発生しました");
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
      logger.error({ action: "sendSessionReservationNotification", err: sessionDateError, sessionDateId }, "日程情報の取得に失敗しました");
      return;
    }

    const session = Array.isArray(sessionDate.sessions)
      ? sessionDate.sessions[0]
      : sessionDate.sessions;

    if (!session?.company_id || !session?.title) {
      logger.error({ action: "sendSessionReservationNotification", sessionDateId }, "説明会情報が不完全です");
      return;
    }

    // 候補者名を取得（名前は profiles に集約）
    const { data: candidateProfile, error: candidateProfileError } = await supabase
      .from("profiles")
      .select("last_name, first_name")
      .eq("candidate_id", candidateId)
      .single();

    if (candidateProfileError || !candidateProfile) {
      logger.error({ action: "sendSessionReservationNotification", err: candidateProfileError, candidateId }, "候補者プロフィールの取得に失敗しました");
      return;
    }

    // 企業名を取得
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", session.company_id)
      .single();

    if (companyError || !company) {
      logger.error({ action: "sendSessionReservationNotification", err: companyError, companyId: session.company_id }, "企業情報の取得に失敗しました");
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
      logger.error({ action: "sendSessionReservationNotification", err: recruitersError, companyId: session.company_id }, "リクルーターの取得に失敗しました");
      return;
    }

    const candidateName = `${candidateProfile.last_name} ${candidateProfile.first_name}`;
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
    logger.error({ action: "sendSessionReservationNotification", err }, "予期しないエラーが発生しました");
  }
}
