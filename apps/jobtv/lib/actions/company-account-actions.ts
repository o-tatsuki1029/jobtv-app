"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert } from "@jobtv-app/shared/types";

type Company = Tables<"companies">;
type CompanyInsert = TablesInsert<"companies">;


/**
 * 企業一覧を取得
 */
export async function getAllCompanies(): Promise<{
  data: Company[] | null;
  error: string | null;
}> {
  try {
    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get all companies error:", error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error("Get all companies error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業一覧の取得に失敗しました",
    };
  }
}

/**
 * 企業とリクルーターアカウントを同時に作成
 */
export async function createCompanyWithRecruiter(
  companyData: {
    name: string;
    industry?: string | null;
    prefecture?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    website?: string | null;
    representative?: string | null;
    established?: string | null;
    employees?: string | null;
    company_info?: string | null;
    status?: "active" | "closed" | null;
  },
  recruiterData: {
    email: string;
    last_name: string;
    first_name: string;
    last_name_kana: string;
    first_name_kana: string;
  }
): Promise<{
  data: { companyId: string; recruiterId: string } | null;
  error: string | null;
}> {
  try {
    const supabaseAdmin = createAdminClient();

    // 既存のメールアドレスをチェック
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", recruiterData.email)
      .single();

    if (existingProfile) {
      return { data: null, error: "このメールアドレスは既に使用されています" };
    }

    // 1. 企業を作成
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: companyData.name,
        industry: companyData.industry || null,
        prefecture: companyData.prefecture || null,
        address_line1: companyData.address_line1 || null,
        address_line2: companyData.address_line2 || null,
        website: companyData.website || null,
        representative: companyData.representative || null,
        established: companyData.established || null,
        employees: companyData.employees || null,
        company_info: companyData.company_info || null,
        status: companyData.status || "active",
      })
      .select()
      .single();

    if (companyError || !newCompany) {
      console.error("Create company error:", companyError);
      return {
        data: null,
        error: companyError?.message || "企業の作成に失敗しました",
      };
    }

    const companyId = newCompany.id;

    // 2. リクルーターアカウントを招待（初期パスワード設定メールを送信）
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      recruiterData.email,
      {
        data: {
          first_name: recruiterData.first_name,
          last_name: recruiterData.last_name,
          first_name_kana: recruiterData.first_name_kana,
          last_name_kana: recruiterData.last_name_kana,
          company_id: companyId,
          role: "recruiter",
        },
        redirectTo: `${siteUrl}/auth/update-password`,
      }
    );

    if (inviteError) {
      console.error("Invite user error:", inviteError);
      
      // 企業作成をロールバック（削除）
      await supabaseAdmin.from("companies").delete().eq("id", companyId);

      const errorMessage =
        inviteError instanceof Error
          ? inviteError.message
          : typeof inviteError === "object" &&
              inviteError !== null &&
              "message" in inviteError
            ? String((inviteError as { message: string }).message)
            : "招待メールの送信に失敗しました";

      return {
        data: null,
        error: `リクルーターアカウントの招待に失敗しました: ${errorMessage}`,
      };
    }

    if (!inviteData?.user?.id) {
      // 企業作成をロールバック（削除）
      await supabaseAdmin.from("companies").delete().eq("id", companyId);

      return {
        data: null,
        error: "リクルーターアカウントの招待に失敗しました（ユーザーIDが取得できませんでした）",
      };
    }

    const userId = inviteData.user.id;

    // 3. profilesレコードを待機（最大3秒、100ms間隔でポーリング）
    let profileExists = false;
    for (let i = 0; i < 30; i++) {
      const { data: existingProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (existingProfile) {
        profileExists = true;
        break;
      }

      // 100ms待機
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 4. profilesテーブルにリクルーター情報を登録
    const now = new Date().toISOString();
    const profileData = {
      id: userId,
      email: recruiterData.email,
      role: "recruiter" as const,
      company_id: companyId,
      last_name: recruiterData.last_name,
      first_name: recruiterData.first_name,
      last_name_kana: recruiterData.last_name_kana,
      first_name_kana: recruiterData.first_name_kana,
      updated_at: now,
    };

    let upsertError;
    if (profileExists) {
      // レコードが存在する場合は更新
      const { error } = await supabaseAdmin
        .from("profiles")
        .update(profileData)
        .eq("id", userId);
      upsertError = error;
    } else {
      // レコードが存在しない場合はupsert
      const { error } = await supabaseAdmin
        .from("profiles")
        .upsert(profileData, {
          onConflict: "id",
        });
      upsertError = error;
    }

    if (upsertError) {
      const errorMessage =
        upsertError.message ||
        (typeof upsertError === "object" &&
        upsertError !== null &&
        "message" in upsertError
          ? String(upsertError.message)
          : JSON.stringify(upsertError));

      // 企業とauth.usersをロールバック
      await supabaseAdmin.from("companies").delete().eq("id", companyId);
      await supabaseAdmin.auth.admin.deleteUser(userId);

      return {
        data: null,
        error: `プロファイル情報の更新に失敗しました: ${errorMessage}`,
      };
    }

    revalidatePath("/admin/company-accounts");
    return {
      data: {
        companyId,
        recruiterId: userId,
      },
      error: null,
    };
  } catch (error) {
    console.error("Create company with recruiter error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "企業とリクルーターアカウントの作成に失敗しました",
    };
  }
}

