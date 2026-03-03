import { cookies } from "next/headers";
import { getAdminClient } from "@jobtv-app/shared/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function saveRecruiterRating(
  companyId: string,
  eventId: string,
  candidateId: string,
  overallRating: number,
  comment?: string | null,
  recruiterId?: string // 管理者が代理で評価する場合に使用（オプション）
) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // 管理者の場合はrecruiterIdをパラメータから取得、それ以外はクッキーから取得
  let targetRecruiterId: string | null = null;
  
  if (user && recruiterId) {
    // 管理者が代理で評価する場合
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userProfile?.role === "admin") {
      // 管理者の場合はrecruiterIdを使用（nullの場合は企業全体の評価）
      targetRecruiterId = recruiterId || null;
    }
  }
  
  if (!targetRecruiterId && user) {
    // 通常の企業評価の場合、ログインしているユーザーのIDを使用
    targetRecruiterId = user.id;
  }

  if (!user) {
    throw new Error("ログインしていません");
  }

  if (!companyId || !eventId || !candidateId || !overallRating) {
    throw new Error("必須項目が不足しています");
  }

  // コメントが60字を超えている場合
  if (comment && comment.trim().length > 60) {
    throw new Error("コメントは60字以内で入力してください");
  }

  // service_roleキーを使用してRLSをバイパス
  const adminSupabase = getAdminClient();

  // 既存の評価を確認
  const { data: existingRating, error: checkError } = await adminSupabase
    .from("event_ratings_recruiter_to_candidate")
    .select("id")
    .eq("company_id", companyId)
    .eq("candidate_id", candidateId)
    .eq("event_id", eventId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116は「行が見つからない」エラー（新規作成の場合）
    throw new Error("評価の確認に失敗しました");
  }

  if (existingRating) {
    // 更新
    const { error: updateError } = await adminSupabase
      .from("event_ratings_recruiter_to_candidate")
      .update({
        overall_rating: overallRating,
        comment: comment?.trim() || null,
        recruiter_id: targetRecruiterId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRating.id);

    if (updateError) {
      throw new Error("評価の更新に失敗しました");
    }

    return { success: true, action: "updated" as const };
  } else {
    // 新規作成
    const { error: insertError } = await adminSupabase
      .from("event_ratings_recruiter_to_candidate")
      .insert({
        company_id: companyId,
        candidate_id: candidateId,
        event_id: eventId,
        overall_rating: overallRating,
        comment: comment?.trim() || null,
        recruiter_id: targetRecruiterId,
      });

    if (insertError) {
      throw new Error("評価の登録に失敗しました");
    }

    return { success: true, action: "created" as const };
  }
}

