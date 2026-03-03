import { cookies } from "next/headers";
import { getAdminClient } from "@jobtv-app/shared/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sanitizeString, sanitizeNumber, isValidUUID } from "@/utils/validation/sanitize";

export async function saveCandidateRating(
  companyId: string,
  eventId: string,
  rating: number,
  comment?: string | null,
  candidateId?: string // 管理者が代理で評価する場合に使用
) {
  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // 入力値の検証とサニタイゼーション
  if (!companyId || !isValidUUID(companyId)) {
    throw new Error("無効な企業IDです");
  }
  if (!eventId || !isValidUUID(eventId)) {
    throw new Error("無効なイベントIDです");
  }
  
  // 評価値の検証（1-5の範囲）
  const sanitizedRating = sanitizeNumber(rating, 1, 5);
  if (!sanitizedRating || sanitizedRating < 1 || sanitizedRating > 5) {
    throw new Error("評価は1から5の範囲で入力してください");
  }
  
  // 管理者の場合はcandidateIdをパラメータから取得、それ以外はクッキーから取得
  let targetCandidateId: string | null = null;
  
  if (user && candidateId) {
    // 管理者が代理で評価する場合
    if (!isValidUUID(candidateId)) {
      throw new Error("無効な学生IDです");
    }
    
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (userProfile?.role === "admin") {
      targetCandidateId = candidateId;
    }
  }
  
  if (!targetCandidateId) {
    // 通常の学生評価の場合
    targetCandidateId = cookieStore.get("candidate_id")?.value || null;
  }

  if (!targetCandidateId || !isValidUUID(targetCandidateId)) {
    throw new Error("ログインしていません");
  }

  // コメント（気に入ったところのJSON配列）の検証とサニタイゼーション
  let sanitizedComment: string | null = null;
  if (comment) {
    try {
      const parsed = JSON.parse(comment);
      if (Array.isArray(parsed)) {
        // 配列の各要素をサニタイズ
        const sanitizedArray = parsed
          .filter((item): item is string => typeof item === "string")
          .map((item) => sanitizeString(item))
          .filter((item) => item.length > 0 && item.length <= 100); // 各項目は100文字以内
        
        if (sanitizedArray.length === 0) {
          throw new Error("気に入ったところを1つ以上選択してください");
        }
        
        sanitizedComment = JSON.stringify(sanitizedArray);
      } else {
        // 文字列コメントの場合（後方互換性）
        const sanitized = sanitizeString(parsed);
        sanitizedComment = sanitized.length > 0 && sanitized.length <= 500 ? sanitized : null;
      }
    } catch (parseError) {
      // JSONでない場合は文字列としてサニタイズ（後方互換性のため）
      const sanitized = sanitizeString(comment);
      sanitizedComment = sanitized.length > 0 && sanitized.length <= 500 ? sanitized : null;
    }
  }

  // service_roleキーを使用してRLSをバイパス
  const adminSupabase = getAdminClient();

  // 既存の評価を確認
  const { data: existingRating, error: checkError } = await adminSupabase
    .from("event_ratings_candidate_to_company")
    .select("id")
    .eq("candidate_id", targetCandidateId)
    .eq("company_id", companyId)
    .eq("event_id", eventId)
    .single();

  if (checkError && checkError.code !== "PGRST116") {
    // PGRST116は「行が見つからない」エラー（新規作成の場合）
    throw new Error("評価の確認に失敗しました");
  }

  if (existingRating) {
    // 更新
    const { error: updateError } = await adminSupabase
      .from("event_ratings_candidate_to_company")
      .update({
        rating: sanitizedRating,
        comment: sanitizedComment,
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
      .from("event_ratings_candidate_to_company")
      .insert({
        candidate_id: targetCandidateId,
        company_id: companyId,
        event_id: eventId,
        rating: sanitizedRating,
        comment: sanitizedComment,
      });

    if (insertError) {
      throw new Error("評価の登録に失敗しました");
    }

    return { success: true, action: "created" as const };
  }
}

