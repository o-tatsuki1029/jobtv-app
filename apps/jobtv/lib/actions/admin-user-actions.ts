"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

/**
 * 全ての管理者アカウントを取得（削除されていないもののみ）
 */
export async function getAllAdmins(): Promise<{
  data: any[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { data: admins, error } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, first_name_kana, last_name_kana, role, created_at, deleted_at")
      .eq("role", "admin")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ action: "getAllAdmins", err: error }, "管理者一覧の取得に失敗しました");
      return { data: null, error: error.message };
    }

    return { data: admins, error: null };
  } catch (error) {
    logger.error({ action: "getAllAdmins", err: error }, "管理者一覧の取得に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "管理者アカウントの取得に失敗しました",
    };
  }
}

/**
 * 管理者アカウントを作成
 */
export async function createAdmin(
  email: string,
  password: string,
  lastName: string,
  firstName: string,
  lastNameKana: string,
  firstNameKana: string
): Promise<{
  data: { message: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 既存のユーザーをチェック
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return { data: null, error: "このメールアドレスは既に使用されています" };
    }

    // 管理者権限でユーザーを作成
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        first_name_kana: firstNameKana,
        last_name_kana: lastNameKana,
        role: "admin",
      },
    });

    if (createError) {
      logger.error({ action: "createAdmin", err: createError }, "管理者ユーザーの作成に失敗しました");
      return { data: null, error: createError.message };
    }

    if (!newUser.user) {
      return { data: null, error: "ユーザーの作成に失敗しました" };
    }

    // プロフィールを更新
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        first_name_kana: firstNameKana,
        last_name_kana: lastNameKana,
        role: "admin",
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      logger.error({ action: "createAdmin", err: updateError }, "管理者プロフィールの更新に失敗しました");
      return { data: null, error: "プロフィールの更新に失敗しました" };
    }

    revalidatePath("/admin/users");
    return { data: { message: "管理者アカウントを作成しました" }, error: null };
  } catch (error) {
    logger.error({ action: "createAdmin", err: error }, "管理者アカウントの作成に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "管理者アカウントの作成に失敗しました",
    };
  }
}

/**
 * 管理者アカウントを削除（論理削除）
 */
export async function deleteAdmin(adminId: string): Promise<{
  data: { message: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 現在のユーザーを取得
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "認証が必要です" };
    }

    // 自分自身を削除しようとしていないかチェック
    if (user.id === adminId) {
      return { data: null, error: "自分自身のアカウントは削除できません" };
    }

    // 論理削除: deleted_atに現在時刻を設定
    const { error: deleteError } = await supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", adminId);

    if (deleteError) {
      logger.error({ action: "deleteAdmin", err: deleteError, adminId }, "管理者の論理削除に失敗しました");
      return { data: null, error: deleteError.message };
    }

    revalidatePath("/admin/users");
    return { data: { message: "管理者アカウントを削除しました" }, error: null };
  } catch (error) {
    logger.error({ action: "deleteAdmin", err: error, adminId }, "管理者アカウントの削除に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "管理者アカウントの削除に失敗しました",
    };
  }
}

/**
 * 管理者アカウントを更新
 */
export async function updateAdmin(
  adminId: string,
  lastName: string,
  firstName: string,
  lastNameKana: string,
  firstNameKana: string
): Promise<{
  data: { message: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        first_name_kana: firstNameKana,
        last_name_kana: lastNameKana,
      })
      .eq("id", adminId);

    if (updateError) {
      logger.error({ action: "updateAdmin", err: updateError, adminId }, "管理者プロフィールの更新に失敗しました");
      return { data: null, error: "プロフィールの更新に失敗しました" };
    }

    revalidatePath("/admin/users");
    return { data: { message: "管理者アカウントを更新しました" }, error: null };
  } catch (error) {
    logger.error({ action: "updateAdmin", err: error, adminId }, "管理者アカウントの更新に失敗しました");
    return {
      data: null,
      error: error instanceof Error ? error.message : "管理者アカウントの更新に失敗しました",
    };
  }
}

