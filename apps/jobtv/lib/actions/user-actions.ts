"use server";

import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

/**
 * ログイン中のユーザー名と企業名を取得
 */
export async function getUserInfo(): Promise<{
  userName: string | null;
  companyName: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: getUserError
    } = await supabase.auth.getUser();

    if (getUserError || !user) {
      return { userName: null, companyName: null, error: "認証が必要です" };
    }

    const { data: userProfile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, company_id, deleted_at")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return { userName: null, companyName: null, error: "ユーザー情報の取得に失敗しました" };
    }

    // 論理削除されている場合でも名前は表示
    // first_nameとlast_nameを組み合わせ、なければメールアドレスを使用
    const userName =
      userProfile.first_name && userProfile.last_name
        ? `${userProfile.last_name} ${userProfile.first_name}`
        : user.email || null;

    // 企業名を取得
    let companyName: string | null = null;
    if (userProfile.company_id) {
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("name")
        .eq("id", userProfile.company_id)
        .single();

      if (!companyError && company) {
        companyName = company.name;
      }
    }

    return { userName, companyName, error: null };
  } catch (error) {
    logger.error({ action: "getUserInfo", err: error }, "ユーザー情報の取得に失敗");
    return {
      userName: null,
      companyName: null,
      error: error instanceof Error ? error.message : "ユーザー情報の取得に失敗しました"
    };
  }
}
