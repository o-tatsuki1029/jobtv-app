"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";

const ALLOWED_LOGO_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB

type LpCompanyLogoRow = {
  id: string;
  name: string;
  image_url: string;
  row_position: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

/** 公開用: row_position ごとに display_order 昇順で全件取得 */
export async function getLpCompanyLogos(): Promise<{
  data: LpCompanyLogoRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lp_company_logos")
      .select("*")
      .order("row_position", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getLpCompanyLogos", err: e }, "LP企業ロゴの取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Admin用: 全件取得 */
export async function getAdminLpCompanyLogos(): Promise<{
  data: LpCompanyLogoRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("lp_company_logos")
      .select("*")
      .order("row_position", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getAdminLpCompanyLogos", err: e }, "管理画面LP企業ロゴの取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** 新規作成 */
export async function createLpCompanyLogo(formData: FormData): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const name = formData.get("name");
  const rowPosition = formData.get("row_position");
  const file = formData.get("file");

  if (!name || typeof name !== "string" || name.trim() === "") {
    return { data: null, error: "企業名を入力してください" };
  }
  if (!rowPosition || typeof rowPosition !== "string" || !["top", "bottom"].includes(rowPosition)) {
    return { data: null, error: "表示位置を選択してください" };
  }
  if (!file || !(file instanceof File)) {
    return { data: null, error: "ロゴ画像を選択してください" };
  }
  if (file.size > MAX_LOGO_SIZE) {
    return { data: null, error: "ファイルサイズは5MB以下にしてください" };
  }
  if (!ALLOWED_LOGO_MIME.includes(file.type)) {
    return { data: null, error: "JPEG, PNG, WebP 形式のみアップロードできます" };
  }

  try {
    const supabase = createAdminClient();
    const { randomUUID } = await import("crypto");
    const id = randomUUID();
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `admin/lp-logos/${id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      logger.error({ action: "createLpCompanyLogo", err: uploadError }, "ロゴ画像のアップロードに失敗しました");
      return { data: null, error: uploadError.message };
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    const { data: maxOrder } = await supabase
      .from("lp_company_logos")
      .select("display_order")
      .eq("row_position", rowPosition)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insertError } = await supabase.from("lp_company_logos").insert({
      id,
      name: name.trim(),
      image_url: publicUrl,
      row_position: rowPosition,
      display_order: nextOrder
    });

    if (insertError) {
      logger.error({ action: "createLpCompanyLogo", err: insertError }, "ロゴレコードの挿入に失敗しました");
      return { data: null, error: insertError.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: { id }, error: null };
  } catch (e) {
    logger.error({ action: "createLpCompanyLogo", err: e }, "ロゴの作成に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "作成に失敗しました" };
  }
}

/** 更新 */
export async function updateLpCompanyLogo(
  id: string,
  formData: FormData
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const name = formData.get("name");
  const rowPosition = formData.get("row_position");
  const file = formData.get("file");

  if (!name || typeof name !== "string" || name.trim() === "") {
    return { data: null, error: "企業名を入力してください" };
  }
  if (!rowPosition || typeof rowPosition !== "string" || !["top", "bottom"].includes(rowPosition)) {
    return { data: null, error: "表示位置を選択してください" };
  }

  try {
    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {
      name: name.trim(),
      row_position: rowPosition,
      updated_at: new Date().toISOString()
    };

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_LOGO_SIZE) {
        return { data: null, error: "ファイルサイズは5MB以下にしてください" };
      }
      if (!ALLOWED_LOGO_MIME.includes(file.type)) {
        return { data: null, error: "JPEG, PNG, WebP 形式のみアップロードできます" };
      }

      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `admin/lp-logos/${id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        logger.error({ action: "updateLpCompanyLogo", err: uploadError }, "ロゴ画像のアップロードに失敗しました");
        return { data: null, error: uploadError.message };
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("company-assets").getPublicUrl(fileName);

      updates.image_url = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("lp_company_logos")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.error({ action: "updateLpCompanyLogo", err: updateError }, "ロゴの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "updateLpCompanyLogo", err: e }, "ロゴの更新に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "更新に失敗しました" };
  }
}

/** 削除 */
export async function deleteLpCompanyLogo(
  id: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("lp_company_logos").delete().eq("id", id);

    if (error) {
      logger.error({ action: "deleteLpCompanyLogo", err: error }, "ロゴの削除に失敗しました");
      return { data: null, error: error.message };
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "deleteLpCompanyLogo", err: e }, "ロゴの削除に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}

/** 段ごとの並び替え */
export async function reorderLpCompanyLogos(
  orderedIds: string[],
  rowPosition: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  if (orderedIds.length === 0) return { data: true, error: null };

  try {
    const supabase = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("lp_company_logos")
        .update({ display_order: i, row_position: rowPosition })
        .eq("id", orderedIds[i]);

      if (error) {
        logger.error({ action: "reorderLpCompanyLogos", err: error }, "ロゴの並び替えに失敗しました");
        return { data: null, error: error.message };
      }
    }

    revalidatePath("/service/recruitment-marketing");
    revalidatePath("/admin/lp-content");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "reorderLpCompanyLogos", err: e }, "ロゴの並び替えに失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "並び替えに失敗しました" };
  }
}
