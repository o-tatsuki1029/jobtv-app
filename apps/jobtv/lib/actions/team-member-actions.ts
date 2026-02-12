"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables } from "@jobtv-app/shared/types";
import { getUserCompanyId, checkCompanyEditPermission } from "@jobtv-app/shared/actions/company-utils";

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
      .select("company_id")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return { data: null, error: "メンバーが見つかりません" };
    }

    if (member.company_id !== companyId) {
      return { data: null, error: "このメンバーは削除できません" };
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

    revalidatePath("/studio/settings");

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
 */
export async function updateTeamMemberRole(
  memberId: string,
  role: "admin" | "recruiter"
): Promise<{
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

    // 更新対象のメンバーが同じ企業に所属しているか確認
    const { data: member, error: memberError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", memberId)
      .single();

    if (memberError || !member) {
      return { data: null, error: "メンバーが見つかりません" };
    }

    if (member.company_id !== companyId) {
      return { data: null, error: "このメンバーの権限を変更できません" };
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

    revalidatePath("/studio/settings");

    return { data: updatedMember as ProfileRow, error: null };
  } catch (error) {
    console.error("Update team member role error:", error);
    return {
      data: null,
      error: error instanceof Error ? error.message : "チームメンバーの権限更新に失敗しました"
    };
  }
}

