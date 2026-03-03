"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Tables } from "@jobtv-app/shared/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";

type ProfileRow = Tables<"profiles">;

/**
 * チームメンバー一覧を取得
 */
export async function getTeamMembers(): Promise<{
  data: ProfileRow[] | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();

    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get team members error:", error);
      return { data: null, error: error.message };
    }

    return { data: data as ProfileRow[], error: null };
  } catch (error) {
    console.error("Get team members error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "チームメンバーの取得に失敗しました"
    };
  }
}

/**
 * チームメンバーを削除（企業から外す）
 * 注意: 管理者ロールのメンバーは削除できません
 */
export async function removeTeamMember(memberId: string): Promise<{
  data: ProfileRow | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();

    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    const supabase = await createClient();

    // 削除対象のメンバーが同じ企業に所属しているか確認
    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return { data: null, error: "メンバーが見つかりません" };
    }

    if (member.company_id !== companyId) {
      return { data: null, error: "このメンバーは削除できません" };
    }

    // 管理者は削除不可
    if (member.role === "admin") {
      return { data: null, error: "システム管理者は削除できません" };
    }

    // company_idをnullに設定（削除ではなく企業から外す）
    const { data: updatedMember, error: updateError } = await supabase
      .from("profiles")
      .update({ company_id: null })
      .eq("id", memberId)
      .select()
      .single();

    if (updateError) {
      console.error("Remove team member error:", updateError);
      return { data: null, error: updateError.message };
    }

    revalidatePath("/studio/settings/members");

    return { data: updatedMember as ProfileRow, error: null };
  } catch (error) {
    console.error("Remove team member error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "チームメンバーの削除に失敗しました"
    };
  }
}

/**
 * チームメンバーの権限を更新
 * 注意: 管理者ロールへの変更は許可されていません
 */
export async function updateTeamMemberRole(
  memberId: string,
  role: "admin" | "recruiter"
): Promise<{
  data: ProfileRow | null;
  error: string | null;
}> {
  try {
    // 管理者ロールへの変更を防ぐ
    if (role === "admin") {
      return { data: null, error: "管理者ロールは設定できません" };
    }

    const { companyId, error: companyIdError } = await getUserCompanyId();

    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    const supabase = await createClient();

    // 更新対象のメンバーが同じ企業に所属しているか確認
    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("company_id, role")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return { data: null, error: "メンバーが見つかりません" };
    }

    if (member.company_id !== companyId) {
      return { data: null, error: "このメンバーの権限を変更できません" };
    }

    // 既に管理者のメンバーは変更不可
    if (member.role === "admin") {
      return { data: null, error: "システム管理者の権限は変更できません" };
    }

    // 権限を更新
    const { data: updatedMember, error: updateError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", memberId)
      .select()
      .single();

    if (updateError) {
      console.error("Update team member role error:", updateError);
      return { data: null, error: updateError.message };
    }

    revalidatePath("/studio/settings/members");

    return { data: updatedMember as ProfileRow, error: null };
  } catch (error) {
    console.error("Update team member role error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "チームメンバーの権限更新に失敗しました"
    };
  }
}

/**
 * チームメンバーを招待
 * Supabaseの招待機能を使用してメールを送信
 */
export async function inviteTeamMember(
  email: string,
  firstName: string,
  lastName: string,
  firstNameKana: string,
  lastNameKana: string
): Promise<{
  data: { email: string } | null;
  error: string | null;
}> {
  try {
    const { companyId, error: companyIdError } = await getUserCompanyId();

    if (companyIdError) {
      return { data: null, error: companyIdError };
    }

    // 権限チェック
    const permissionCheck = await checkCompanyEditPermission(companyId);
    if (!permissionCheck.allowed) {
      return { data: null, error: permissionCheck.error || "編集権限がありません" };
    }

    const supabase = await createClient();

    // 既に同じメールアドレスのユーザーが存在するかチェック
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id, email, company_id")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      console.error("Check existing profile error:", checkError);
      return { data: null, error: "ユーザーの確認に失敗しました" };
    }

    if (existingProfile) {
      if (existingProfile.company_id === companyId) {
        return { data: null, error: "このメールアドレスは既にチームメンバーです" };
      } else if (existingProfile.company_id) {
        return { data: null, error: "このメールアドレスは既に他の企業に所属しています" };
      } else {
        // company_idがnullの場合は、このユーザーを企業に追加
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            company_id: companyId,
            first_name: firstName,
            last_name: lastName,
            first_name_kana: firstNameKana,
            last_name_kana: lastNameKana,
            role: "recruiter",
          })
          .eq("id", existingProfile.id);

        if (updateError) {
          console.error("Update existing profile error:", updateError);
          return { data: null, error: "メンバーの追加に失敗しました" };
        }

        revalidatePath("/studio/settings/members");
        return { data: { email }, error: null };
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const supabaseAdmin = createAdminClient();

    // 企業名を取得（招待メールの変数用）
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    // 招待リンクを生成（メールは SendGrid で自前送信）
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          first_name_kana: firstNameKana,
          last_name_kana: lastNameKana,
          company_id: companyId,
          role: "recruiter",
        },
        redirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (linkError) {
      console.error("generateLink error:", linkError);
      return { data: null, error: "招待リンクの生成に失敗しました" };
    }

    // SendGrid で招待メールを送信
    const { error: emailError } = await sendTemplatedEmail({
      templateName:   "invite_team_member",
      recipientEmail: email,
      variables: {
        first_name:   firstName,
        last_name:    lastName,
        company_name: company?.name ?? "",
        invite_url:   linkData.properties.action_link,
        site_url:     siteUrl,
      },
    });

    if (emailError) {
      console.error("招待メールの送信に失敗しました:", emailError);
      return { data: null, error: "招待メールの送信に失敗しました" };
    }

    revalidatePath("/studio/settings/members");

    return { data: { email }, error: null };
  } catch (error) {
    console.error("Invite team member error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "メンバーの招待に失敗しました"
    };
  }
}

