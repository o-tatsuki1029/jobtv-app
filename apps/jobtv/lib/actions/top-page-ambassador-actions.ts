"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type AmbassadorRow = {
  id: string;
  name: string;
  avatar_url: string;
  link_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

/** トップページ公開用: display_order 昇順で全件取得 */
export async function getTopPageAmbassadors(): Promise<{
  data: AmbassadorRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("top_page_ambassadors")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getTopPageAmbassadors", err: e }, "アンバサダー一覧の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Admin管理画面用: display_order 昇順で全件取得 */
export async function getAdminTopPageAmbassadors(): Promise<{
  data: AmbassadorRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("top_page_ambassadors")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getAdminTopPageAmbassadors", err: e }, "管理画面アンバサダー一覧の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** アンバサダーを新規作成。FormData に name, link_url, file を期待する */
export async function createTopPageAmbassador(formData: FormData): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const name = formData.get("name");
  const linkUrl = formData.get("link_url");
  const file = formData.get("file");

  if (!name || typeof name !== "string" || name.trim() === "") {
    return { data: null, error: "名前を入力してください" };
  }
  if (!file || !(file instanceof File)) {
    return { data: null, error: "画像ファイルを選択してください" };
  }
  if (file.size > MAX_FILE_SIZE) {
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
    const fileName = `admin/ambassadors/${id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      logger.error({ action: "createTopPageAmbassador", err: uploadError }, "アバター画像のアップロードに失敗しました");
      return { data: null, error: uploadError.message };
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    const { data: maxOrder } = await supabase
      .from("top_page_ambassadors")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insertError } = await supabase.from("top_page_ambassadors").insert({
      id,
      name: name.trim(),
      avatar_url: publicUrl,
      link_url: linkUrl && typeof linkUrl === "string" && linkUrl.trim() !== "" ? linkUrl.trim() : null,
      display_order: nextOrder
    });

    if (insertError) {
      logger.error({ action: "createTopPageAmbassador", err: insertError }, "アンバサダーレコードの挿入に失敗しました");
      return { data: null, error: insertError.message };
    }

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: { id }, error: null };
  } catch (e) {
    logger.error({ action: "createTopPageAmbassador", err: e }, "アンバサダーの作成に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "作成に失敗しました" };
  }
}

/** アンバサダーを更新。FormData に name, link_url, file(optional) を期待する */
export async function updateTopPageAmbassador(
  id: string,
  formData: FormData
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const name = formData.get("name");
  const linkUrl = formData.get("link_url");
  const file = formData.get("file");

  if (!name || typeof name !== "string" || name.trim() === "") {
    return { data: null, error: "名前を入力してください" };
  }

  try {
    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {
      name: name.trim(),
      link_url: linkUrl && typeof linkUrl === "string" && linkUrl.trim() !== "" ? linkUrl.trim() : null,
      updated_at: new Date().toISOString()
    };

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_SIZE) {
        return { data: null, error: "ファイルサイズは5MB以下にしてください" };
      }
      if (!ALLOWED_MIME.includes(file.type)) {
        return { data: null, error: "JPEG, PNG, WebP, GIF 形式のみアップロードできます" };
      }

      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `admin/ambassadors/${id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        logger.error({ action: "updateTopPageAmbassador", err: uploadError }, "アバター画像のアップロードに失敗しました");
        return { data: null, error: uploadError.message };
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("company-assets").getPublicUrl(fileName);

      updates.avatar_url = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("top_page_ambassadors")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.error({ action: "updateTopPageAmbassador", err: updateError }, "アンバサダーの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "updateTopPageAmbassador", err: e }, "アンバサダーの更新に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "更新に失敗しました" };
  }
}

/** アンバサダーを削除 */
export async function deleteTopPageAmbassador(
  id: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("top_page_ambassadors").delete().eq("id", id);

    if (error) {
      logger.error({ action: "deleteTopPageAmbassador", err: error }, "アンバサダーの削除に失敗しました");
      return { data: null, error: error.message };
    }

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "deleteTopPageAmbassador", err: e }, "アンバサダーの削除に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}

/** 表示順を一括更新。orderedIds は id の配列 */
export async function reorderTopPageAmbassadors(
  orderedIds: string[]
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  if (orderedIds.length === 0) return { data: true, error: null };

  try {
    const supabase = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("top_page_ambassadors")
        .update({ display_order: i })
        .eq("id", orderedIds[i]);

      if (error) {
        logger.error({ action: "reorderTopPageAmbassadors", err: error }, "アンバサダーの並び替えに失敗しました");
        return { data: null, error: error.message };
      }
    }

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "reorderTopPageAmbassadors", err: e }, "アンバサダーの並び替えに失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "並び替えに失敗しました" };
  }
}
