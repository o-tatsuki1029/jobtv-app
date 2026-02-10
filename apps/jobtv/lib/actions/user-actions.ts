"use server";

import { createClient } from "@/lib/supabase/server";

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
      .select("full_name, first_name, last_name, company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !userProfile) {
      return { userName: null, companyName: null, error: "ユーザー情報の取得に失敗しました" };
    }

    // full_nameがあればそれを使用、なければfirst_nameとlast_nameを組み合わせ
    const userName =
      userProfile.full_name ||
      (userProfile.first_name && userProfile.last_name
        ? `${userProfile.last_name} ${userProfile.first_name}`
        : userProfile.first_name || userProfile.last_name || null);

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
    console.error("Get user info error:", error);
    return {
      userName: null,
      companyName: null,
      error: error instanceof Error ? error.message : "ユーザー情報の取得に失敗しました"
    };
  }
}
