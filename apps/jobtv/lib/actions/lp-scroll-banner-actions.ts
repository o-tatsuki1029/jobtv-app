"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

type LpScrollBannerRow = {
  id: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** 公開用: アクティブなバナーを1件取得 */
export async function getActiveLpScrollBanner(): Promise<{
  data: LpScrollBannerRow | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lp_scroll_banner")
      .select("*")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data ?? null, error: null };
  } catch (e) {
    logger.error({ action: "getActiveLpScrollBanner", err: e }, "LPスクロールバナーの取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Admin用: 全件取得 */
export async function getAdminLpScrollBanners(): Promise<{
  data: LpScrollBannerRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lp_scroll_banner")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getAdminLpScrollBanners", err: e }, "管理画面LPスクロールバナーの取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** 新規作成 */
export async function createLpScrollBanner(formData: FormData): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const linkUrl = formData.get("link_url");
  const file = formData.get("file");

  if (!linkUrl || typeof linkUrl !== "string" || linkUrl.trim() === "") {
    return { data: null, error: "遷移先URLを入力してください" };
  }
  if (!file || !(file instanceof File)) {
    return { data: null, error: "画像ファイルを選択してください" };
  }
  if (file.size > MAX_SIZE) {
    return { data: null, error: "ファイルサイズは5MB以下にしてください" };
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return { data: null, error: "JPEG, PNG, WebP, GIF 形式のみアップロードできます" };
  }

  try {
    const supabase = createAdminClient();
    const { randomUUID } = await import("crypto");
    const id = randomUUID();
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `admin/lp-scroll-banner/${id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      logger.error({ action: "createLpScrollBanner", err: uploadError }, "バナー画像のアップロードに失敗しました");
      return { data: null, error: uploadError.message };
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    const { error: insertError } = await supabase.from("lp_scroll_banner").insert({
      id,
      image_url: publicUrl,
      link_url: linkUrl.trim(),
      is_active: true
    });

    if (insertError) {
      logger.error({ action: "createLpScrollBanner", err: insertError }, "バナーレコードの挿入に失敗しました");
      return { data: null, error: insertError.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: { id }, error: null };
  } catch (e) {
    logger.error({ action: "createLpScrollBanner", err: e }, "バナーの作成に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "作成に失敗しました" };
  }
}

/** 更新 */
export async function updateLpScrollBanner(
  id: string,
  formData: FormData
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const linkUrl = formData.get("link_url");
  const file = formData.get("file");
  const isActive = formData.get("is_active");

  if (!linkUrl || typeof linkUrl !== "string" || linkUrl.trim() === "") {
    return { data: null, error: "遷移先URLを入力してください" };
  }

  try {
    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {
      link_url: linkUrl.trim(),
      is_active: isActive === "true",
      updated_at: new Date().toISOString()
    };

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_SIZE) {
        return { data: null, error: "ファイルサイズは5MB以下にしてください" };
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        return { data: null, error: "JPEG, PNG, WebP, GIF 形式のみアップロードできます" };
      }

      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `admin/lp-scroll-banner/${id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        logger.error({ action: "updateLpScrollBanner", err: uploadError }, "バナー画像のアップロードに失敗しました");
        return { data: null, error: uploadError.message };
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("company-assets").getPublicUrl(fileName);

      updates.image_url = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("lp_scroll_banner")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.error({ action: "updateLpScrollBanner", err: updateError }, "バナーの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "updateLpScrollBanner", err: e }, "バナーの更新に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "更新に失敗しました" };
  }
}

/** 削除 */
export async function deleteLpScrollBanner(
  id: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("lp_scroll_banner").delete().eq("id", id);

    if (error) {
      logger.error({ action: "deleteLpScrollBanner", err: error }, "バナーの削除に失敗しました");
      return { data: null, error: error.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "deleteLpScrollBanner", err: e }, "バナーの削除に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}
