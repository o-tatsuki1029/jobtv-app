"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { enqueueStorageDeletion } from "@/lib/storage/deletion-queue";
import { extractSupabaseStoragePath } from "@/lib/storage/storage-cleanup";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type ShunDiaryRow = {
  id: string;
  title: string;
  thumbnail_url: string;
  link_url: string | null;
  channel: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

/** トップページ公開用: display_order 昇順で全件取得 */
export async function getTopPageShunDiaries(): Promise<{
  data: ShunDiaryRow[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("top_page_shun_diaries")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getTopPageShunDiaries", err: e }, "しゅんダイアリー一覧の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** Admin管理画面用: display_order 昇順で全件取得 */
export async function getAdminTopPageShunDiaries(): Promise<{
  data: ShunDiaryRow[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("top_page_shun_diaries")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
  } catch (e) {
    logger.error({ action: "getAdminTopPageShunDiaries", err: e }, "管理画面しゅんダイアリー一覧の取得に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "取得に失敗しました" };
  }
}

/** しゅんダイアリーを新規作成。FormData に title, link_url, file を期待する */
export async function createTopPageShunDiary(formData: FormData): Promise<{
  data: { id: string } | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  const title = formData.get("title");
  const linkUrl = formData.get("link_url");
  const file = formData.get("file");

  if (!title || typeof title !== "string" || title.trim() === "") {
    return { data: null, error: "タイトルを入力してください" };
  }
  if (!file || !(file instanceof File)) {
    return { data: null, error: "サムネイル画像を選択してください" };
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
    const fileName = `admin/shun-diaries/${id}/${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("company-assets")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      logger.error({ action: "createTopPageShunDiary", err: uploadError }, "サムネイル画像のアップロードに失敗しました");
      return { data: null, error: uploadError.message };
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from("company-assets").getPublicUrl(fileName);

    const { data: maxOrder } = await supabase
      .from("top_page_shun_diaries")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insertError } = await supabase.from("top_page_shun_diaries").insert({
      id,
      title: title.trim(),
      thumbnail_url: publicUrl,
      link_url: linkUrl && typeof linkUrl === "string" && linkUrl.trim() !== "" ? linkUrl.trim() : null,
      display_order: nextOrder
    });

    if (insertError) {
      logger.error({ action: "createTopPageShunDiary", err: insertError }, "しゅんダイアリーレコードの挿入に失敗しました");
      return { data: null, error: insertError.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "shundiary.create",
        category: "content_edit",
        resourceType: "top_page_shun_diaries",
        resourceId: id,
        app: "jobtv",
        metadata: { title: title.trim() },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: { id }, error: null };
  } catch (e) {
    logger.error({ action: "createTopPageShunDiary", err: e }, "しゅんダイアリーの作成に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "作成に失敗しました" };
  }
}

/** しゅんダイアリーを更新。FormData に title, link_url, file(optional) を期待する */
export async function updateTopPageShunDiary(
  id: string,
  formData: FormData
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  const title = formData.get("title");
  const linkUrl = formData.get("link_url");
  const file = formData.get("file");

  if (!title || typeof title !== "string" || title.trim() === "") {
    return { data: null, error: "タイトルを入力してください" };
  }

  try {
    const supabase = createAdminClient();

    // 旧サムネイルURL取得（差し替え時の旧ファイル削除用）
    const { data: currentRecord } = await supabase
      .from("top_page_shun_diaries")
      .select("thumbnail_url")
      .eq("id", id)
      .maybeSingle();

    const updates: Record<string, unknown> = {
      title: title.trim(),
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
      const fileName = `admin/shun-diaries/${id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        logger.error({ action: "updateTopPageShunDiary", err: uploadError }, "サムネイル画像のアップロードに失敗しました");
        return { data: null, error: uploadError.message };
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("company-assets").getPublicUrl(fileName);

      updates.thumbnail_url = publicUrl;
    }

    const { error: updateError } = await supabase
      .from("top_page_shun_diaries")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      logger.error({ action: "updateTopPageShunDiary", err: updateError }, "しゅんダイアリーの更新に失敗しました");
      return { data: null, error: updateError.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "shundiary.update",
        category: "content_edit",
        resourceType: "top_page_shun_diaries",
        resourceId: id,
        app: "jobtv",
        metadata: { shunDiaryId: id },
      });
    }

    // 旧サムネイルファイル削除をキューに登録
    if (updates.thumbnail_url && currentRecord?.thumbnail_url) {
      const oldPath = extractSupabaseStoragePath(currentRecord.thumbnail_url, "company-assets");
      if (oldPath) {
        void enqueueStorageDeletion({
          storageType: "supabase",
          bucket: "company-assets",
          path: oldPath,
          isPrefix: false,
          source: "update_shun_diary_thumbnail",
          sourceDetail: `shunDiaryId=${id}`,
        });
      }
    }

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "updateTopPageShunDiary", err: e }, "しゅんダイアリーの更新に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "更新に失敗しました" };
  }
}

/** しゅんダイアリーを削除 */
export async function deleteTopPageShunDiary(
  id: string
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("top_page_shun_diaries").delete().eq("id", id);

    if (error) {
      logger.error({ action: "deleteTopPageShunDiary", err: error }, "しゅんダイアリーの削除に失敗しました");
      return { data: null, error: error.message };
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "shundiary.delete",
        category: "content_edit",
        resourceType: "top_page_shun_diaries",
        resourceId: id,
        app: "jobtv",
        metadata: { shunDiaryId: id },
      });
    }

    // Supabase Storage 削除をキューに登録
    void enqueueStorageDeletion({
      storageType: "supabase",
      bucket: "company-assets",
      path: `admin/shun-diaries/${id}/`,
      isPrefix: true,
      source: "delete_shun_diary",
      sourceDetail: `shunDiaryId=${id}`,
    });

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "deleteTopPageShunDiary", err: e }, "しゅんダイアリーの削除に失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "削除に失敗しました" };
  }
}

/** 表示順を一括更新。orderedIds は id の配列 */
export async function reorderTopPageShunDiaries(
  orderedIds: string[]
): Promise<{ data: true | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };

  const supabaseForUser = await createClient();
  const { data: { user } } = await supabaseForUser.auth.getUser();

  if (orderedIds.length === 0) return { data: true, error: null };

  try {
    const supabase = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("top_page_shun_diaries")
        .update({ display_order: i })
        .eq("id", orderedIds[i]);

      if (error) {
        logger.error({ action: "reorderTopPageShunDiaries", err: error }, "しゅんダイアリーの並び替えに失敗しました");
        return { data: null, error: error.message };
      }
    }

    if (user) {
      logAudit({
        userId: user.id,
        action: "shundiaries.reorder",
        category: "content_edit",
        resourceType: "top_page_shun_diaries",
        app: "jobtv",
        metadata: { orderedIds },
      });
    }

    revalidatePath("/");
    revalidatePath("/admin/featured-videos");
    return { data: true, error: null };
  } catch (e) {
    logger.error({ action: "reorderTopPageShunDiaries", err: e }, "しゅんダイアリーの並び替えに失敗しました");
    return { data: null, error: e instanceof Error ? e.message : "並び替えに失敗しました" };
  }
}
