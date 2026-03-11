"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Tables, TablesInsert } from "@jobtv-app/shared/types";
import { logger } from "@/lib/logger";

type Notification = Tables<"notifications">;
type NotificationRead = Tables<"notification_reads">;

export interface NotificationWithReadStatus extends Notification {
  is_read: boolean;
}

/**
 * 企業ユーザー向けのお知らせ一覧を取得
 */
export async function getNotifications() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // ユーザーの企業IDを取得
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();

  if (!profile?.company_id) {
    return { data: null, error: "企業情報が見つかりません" };
  }

  // お知らせを取得（全体向け + 自社向け）
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .or(`target_company_id.is.null,target_company_id.eq.${profile.company_id}`)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getNotifications", err: error }, "お知らせ一覧の取得に失敗");
    return { data: null, error: error.message };
  }

  // 既読情報を取得
  const notificationIds = notifications.map((n) => n.id);
  const { data: reads } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .eq("user_id", user.id)
    .in("notification_id", notificationIds);

  const readIds = new Set(reads?.map((r) => r.notification_id) || []);

  // 既読状態を付与
  const notificationsWithReadStatus: NotificationWithReadStatus[] = notifications.map((n) => ({
    ...n,
    is_read: readIds.has(n.id)
  }));

  return { data: notificationsWithReadStatus, error: null };
}

/**
 * お知らせを既読にする
 */
export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // 既に既読かチェック
  const { data: existing } = await supabase
    .from("notification_reads")
    .select("id")
    .eq("notification_id", notificationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { data: existing, error: null };
  }

  // 既読情報を作成
  const { data, error } = await supabase
    .from("notification_reads")
    .insert({
      notification_id: notificationId,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    logger.error({ action: "markNotificationAsRead", err: error }, "お知らせの既読処理に失敗");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/notifications");
  return { data, error: null };
}

/**
 * 管理者がお知らせを作成
 */
export async function createNotification(
  title: string,
  message: string,
  type: string,
  targetCompanyId?: string | null
) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // 管理者権限チェック
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return { data: null, error: "管理者権限が必要です" };
  }

  const notificationData: TablesInsert<"notifications"> = {
    title,
    message,
    type,
    target_company_id: targetCompanyId || null,
    created_by: user.id
  };

  const { data, error } = await supabase.from("notifications").insert(notificationData).select().single();

  if (error) {
    logger.error({ action: "createNotification", err: error }, "お知らせの作成に失敗");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/notifications");
  revalidatePath("/admin/notifications");
  return { data, error: null };
}

/**
 * 管理者がお知らせを更新
 */
export async function updateNotification(
  notificationId: string,
  title: string,
  message: string,
  type: string,
  targetCompanyId?: string | null
) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // 管理者権限チェック
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return { data: null, error: "管理者権限が必要です" };
  }

  const { data, error } = await supabase
    .from("notifications")
    .update({
      title,
      message,
      type,
      target_company_id: targetCompanyId || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .select()
    .single();

  if (error) {
    logger.error({ action: "updateNotification", err: error }, "お知らせの更新に失敗");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/notifications");
  revalidatePath("/admin/notifications");
  return { data, error: null };
}

/**
 * 管理者がお知らせを削除
 */
export async function deleteNotification(notificationId: string) {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // 管理者権限チェック
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return { data: null, error: "管理者権限が必要です" };
  }

  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);

  if (error) {
    logger.error({ action: "deleteNotification", err: error }, "お知らせの削除に失敗");
    return { data: null, error: error.message };
  }

  revalidatePath("/studio/notifications");
  revalidatePath("/admin/notifications");
  return { data: true, error: null };
}

/**
 * 管理者用: 全てのお知らせを取得
 */
export async function getAllNotificationsForAdmin() {
  const supabase = await createClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "ログインが必要です" };
  }

  // 管理者権限チェック
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile || profile.role !== "admin") {
    return { data: null, error: "管理者権限が必要です" };
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      *,
      companies (
        name
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ action: "getAllNotificationsForAdmin", err: error }, "管理者向けお知らせ一覧の取得に失敗");
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

