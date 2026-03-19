"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { logger } from "@/lib/logger";

interface StudentRow {
  id: string;
  email: string | null;
  last_name: string | null;
  first_name: string | null;
  graduation_year: number | null;
  school_name: string | null;
  phone: string | null;
  created_at: string;
}

/**
 * 学生一覧をページネーション付きで取得
 * profiles (role='candidate') JOIN candidates で一覧取得
 */
export async function getStudents(params: {
  limit: number;
  offset: number;
  search?: string;
  sortBy?: "created_at_desc" | "created_at_asc";
}): Promise<{
  data: StudentRow[] | null;
  count: number | null;
  error: string | null;
}> {
  try {
    const supabaseAdmin = createAdminClient();

    // profiles (role=candidate) を取得し、candidate_id で candidates を結合
    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, email, last_name, first_name, created_at, candidate_id, candidates!profiles_candidate_id_fkey(graduation_year, school_name, phone)",
        { count: "exact" }
      )
      .eq("role", "candidate");

    if (params.search) {
      // 名前またはメールで検索
      query = query.or(
        `email.ilike.%${params.search}%,last_name.ilike.%${params.search}%,first_name.ilike.%${params.search}%`
      );
    }

    if (params.sortBy === "created_at_asc") {
      query = query.order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data, count, error } = await query;

    if (error) {
      logger.error({ action: "getStudents", err: error }, "学生一覧の取得に失敗しました");
      return { data: null, count: null, error: error.message };
    }

    // フラット化
    const students: StudentRow[] = (data || []).map((p: Record<string, unknown>) => {
      const candidate = p.candidates as { graduation_year: number | null; school_name: string | null; phone: string | null } | null;
      return {
        id: p.id as string,
        email: p.email as string | null,
        last_name: p.last_name as string | null,
        first_name: p.first_name as string | null,
        graduation_year: candidate?.graduation_year ?? null,
        school_name: candidate?.school_name ?? null,
        phone: candidate?.phone ?? null,
        created_at: p.created_at as string,
      };
    });

    return { data: students, count: count ?? 0, error: null };
  } catch (error) {
    logger.error({ action: "getStudents", err: error }, "学生一覧の取得に失敗しました");
    return {
      data: null,
      count: null,
      error: error instanceof Error ? error.message : "学生一覧の取得に失敗しました",
    };
  }
}

/**
 * 学生アカウントを作成（管理者のみ）
 */
export async function createStudent(studentData: {
  email: string;
  last_name: string;
  first_name: string;
  last_name_kana: string;
  first_name_kana: string;
  // 以下すべて任意
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  school_type?: string | null;
  school_name?: string | null;
  school_kcode?: string | null;
  faculty_name?: string | null;
  department_name?: string | null;
  major_field?: string | null;
  graduation_year?: number | null;
  desired_work_location?: string[] | null;
  desired_industry?: string[] | null;
  desired_job_type?: string[] | null;
  referrer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
}): Promise<{
  data: { studentId: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  try {
    const supabaseAdmin = createAdminClient();

    // 1. メール重複チェック
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", studentData.email)
      .single();

    if (existingProfile) {
      return { data: null, error: "このメールアドレスは既に使用されています" };
    }

    // 2. 招待リンク生成
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: studentData.email,
      options: {
        data: {
          first_name: studentData.first_name,
          last_name: studentData.last_name,
          first_name_kana: studentData.first_name_kana,
          last_name_kana: studentData.last_name_kana,
          role: "candidate",
        },
        redirectTo: `${siteUrl}/`,
      },
    });

    if (linkError || !linkData?.user?.id) {
      logger.error({ action: "createStudent", err: linkError }, "招待リンクの生成に失敗しました");
      const errorMessage =
        linkError instanceof Error
          ? linkError.message
          : typeof linkError === "object" && linkError !== null && "message" in linkError
            ? String((linkError as { message: string }).message)
            : "招待リンクの生成に失敗しました";
      return {
        data: null,
        error: `学生アカウントの招待に失敗しました: ${errorMessage}`,
      };
    }

    const userId = linkData.user.id;
    const inviteUrl = linkData.properties.action_link;

    // 3. 招待メール送信
    const { error: emailError } = await sendTemplatedEmail({
      templateName: "invite_student",
      recipientEmail: studentData.email,
      variables: {
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        invite_url: inviteUrl,
        site_url: siteUrl,
      },
    });

    if (emailError) {
      logger.error({ action: "createStudent", err: emailError }, "招待メールの送信に失敗しました（アカウントは作成済み）");
    }

    // 4. profiles レコード待機（最大3秒、100ms間隔）
    let profileExists = false;
    for (let i = 0; i < 30; i++) {
      const { data: existingProfilePoll } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (existingProfilePoll) {
        profileExists = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 5. profiles upsert (role=candidate)
    const now = new Date().toISOString();
    const profileData = {
      id: userId,
      email: studentData.email,
      role: "candidate" as const,
      last_name: studentData.last_name,
      first_name: studentData.first_name,
      last_name_kana: studentData.last_name_kana,
      first_name_kana: studentData.first_name_kana,
      updated_at: now,
    };

    let upsertError;
    if (profileExists) {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileData)
        .eq("id", userId);
      upsertError = error;
    } else {
      const { error } = await supabaseAdmin
        .from("profiles")
        .upsert(profileData, { onConflict: "id" });
      upsertError = error;
    }

    if (upsertError) {
      // ロールバック
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return {
        data: null,
        error: `プロファイル情報の更新に失敗しました: ${upsertError.message}`,
      };
    }

    // 6. candidates テーブルに INSERT（名前は profiles に集約済み）
    const { data: newCandidate, error: candidateError } = await supabaseAdmin
      .from("candidates")
      .insert({
        gender: studentData.gender || null,
        date_of_birth: studentData.date_of_birth || null,
        phone: studentData.phone || null,
        school_type: studentData.school_type || null,
        school_name: studentData.school_name || null,
        school_kcode: studentData.school_kcode || null,
        faculty_name: studentData.faculty_name || null,
        department_name: studentData.department_name || null,
        major_field: studentData.major_field || null,
        graduation_year: studentData.graduation_year || null,
        desired_work_location: studentData.desired_work_location || null,
        desired_industry: studentData.desired_industry?.length ? studentData.desired_industry : null,
        desired_job_type: studentData.desired_job_type?.length ? studentData.desired_job_type : null,
        referrer: studentData.referrer || null,
        utm_source: studentData.utm_source || null,
        utm_medium: studentData.utm_medium || null,
        utm_campaign: studentData.utm_campaign || null,
        utm_content: studentData.utm_content || null,
        utm_term: studentData.utm_term || null,
      })
      .select("id")
      .single();

    if (candidateError || !newCandidate) {
      logger.error({ action: "createStudent", err: candidateError }, "候補者情報の作成に失敗しました");
      // ロールバック
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return {
        data: null,
        error: `候補者情報の作成に失敗しました: ${candidateError?.message ?? "不明なエラー"}`,
      };
    }

    // 7. profiles.candidate_id を UPDATE
    const { error: linkCandidateError } = await supabaseAdmin
      .from("profiles")
      .update({ candidate_id: newCandidate.id, updated_at: now })
      .eq("id", userId);

    if (linkCandidateError) {
      logger.error({ action: "createStudent", err: linkCandidateError, userId }, "candidate_idの紐付けに失敗しました（非致命的）");
    }

    if (currentUser) {
      logAudit({
        userId: currentUser.id,
        action: "student.create",
        category: "account",
        resourceType: "candidates",
        app: "jobtv",
        metadata: { studentEmail: studentData.email },
      });
    }

    revalidatePath("/admin/student-accounts");
    return {
      data: { studentId: userId },
      error: null,
    };
  } catch (error) {
    logger.error({ action: "createStudent", err: error }, "学生アカウントの作成に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "学生アカウントの作成に失敗しました",
    };
  }
}
