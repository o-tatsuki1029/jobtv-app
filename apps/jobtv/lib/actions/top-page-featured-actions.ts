"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getUserInfo } from "@jobtv-app/shared/auth";
import type { Video } from "@/types/video.types";
import type { TopPageVideoKind } from "@/lib/actions/video-actions";

async function requireAdmin(): Promise<{ error: string } | null> {
  const userInfo = await getUserInfo();
  if (!userInfo || userInfo.role !== "admin") {
    return { error: "権限がありません" };
  }
  return null;
}

/** トップに選べる動画（active かつ category 一致）。企業名付き。 */
export async function getEligibleVideosForTopPage(kind: TopPageVideoKind): Promise<{
  data: (Video & { company_name: string | null })[] | null;
  error: string | null;
}> {
  const auth = await requireAdmin();
  if (auth) return { data: null, error: auth.error };

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("videos")
      .select("*, companies(name)")
      .eq("status", "active")
      .eq("category", kind)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    const list = (data ?? []).map((v: any) => ({
      ...v,
      company_name: v.companies?.name ?? null
    }));
    return { data: list, error: null };
  } catch (e) {
    console.error("getEligibleVideosForTopPage error:", e);
    return {
      data: null,
      error: e instanceof Error ? e.message : "取得に失敗しました"
    };
  }
}

/** 現在トップに選択されている動画（表示順）。管理画面用。 */
export async function getFeaturedVideosForTopPage(kind: TopPageVideoKind): Promise<{
  data: (Video & { company_name: string | null; display_order: number })[] | null;
  error: string | null;
}> {
  const auth = await requireAdmin();
  if (auth) return { data: null, error: auth.error };

  try {
    const supabase = createAdminClient();
    const { data: featuredRows, error: featuredError } = await supabase
      .from("top_page_featured_videos")
      .select("video_id, display_order")
      .eq("kind", kind)
      .order("display_order", { ascending: true });

    if (featuredError) return { data: null, error: featuredError.message };
    const rows = featuredRows ?? [];
    if (rows.length === 0) return { data: [], error: null };

    const videoIds = rows.map((r) => r.video_id);
    const { data: videosData, error: videosError } = await supabase
      .from("videos")
      .select("*, companies(name)")
      .in("id", videoIds)
      .eq("status", "active");

    if (videosError) return { data: null, error: videosError.message };
    const orderMap = new Map(rows.map((r) => [r.video_id, r.display_order]));
    const list = (videosData ?? []).map((v: any) => ({
      ...v,
      company_name: v.companies?.name ?? null,
      display_order: orderMap.get(v.id) ?? 0
    }));
    list.sort((a, b) => a.display_order - b.display_order);
    return { data: list, error: null };
  } catch (e) {
    console.error("getFeaturedVideosForTopPage error:", e);
    return {
      data: null,
      error: e instanceof Error ? e.message : "取得に失敗しました"
    };
  }
}

/** トップに追加。既にどこかのセクションに含まれている場合はエラー。 */
export async function addFeaturedVideoForTopPage(
  videoId: string,
  kind: TopPageVideoKind
): Promise<{ data: true | null; error: string | null }> {
  const auth = await requireAdmin();
  if (auth) return { data: null, error: auth.error };

  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from("top_page_featured_videos")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle();

    if (existing) {
      return { data: null, error: "この動画は既にトップに登録されています" };
    }

    const { data: maxOrder } = await supabase
      .from("top_page_featured_videos")
      .select("display_order")
      .eq("kind", kind)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error } = await supabase.from("top_page_featured_videos").insert({
      video_id: videoId,
      kind,
      display_order: nextOrder
    });

    if (error) {
      console.error("addFeaturedVideoForTopPage error:", error);
      return { data: null, error: error.message };
    }
    revalidatePath("/");
    return { data: true, error: null };
  } catch (e) {
    console.error("addFeaturedVideoForTopPage error:", e);
    return {
      data: null,
      error: e instanceof Error ? e.message : "追加に失敗しました"
    };
  }
}

/** トップから外す。 */
export async function removeFeaturedVideoForTopPage(
  videoId: string,
  kind: TopPageVideoKind
): Promise<{ data: true | null; error: string | null }> {
  const auth = await requireAdmin();
  if (auth) return { data: null, error: auth.error };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("top_page_featured_videos")
      .delete()
      .eq("video_id", videoId)
      .eq("kind", kind);

    if (error) {
      console.error("removeFeaturedVideoForTopPage error:", error);
      return { data: null, error: error.message };
    }
    revalidatePath("/");
    return { data: true, error: null };
  } catch (e) {
    console.error("removeFeaturedVideoForTopPage error:", e);
    return {
      data: null,
      error: e instanceof Error ? e.message : "削除に失敗しました"
    };
  }
}

/** 表示順を指定した video_id の並びで一括更新。orderedIds は video_id の配列。 */
export async function reorderFeaturedVideosForTopPage(
  kind: TopPageVideoKind,
  orderedIds: string[]
): Promise<{ data: true | null; error: string | null }> {
  const auth = await requireAdmin();
  if (auth) return { data: null, error: auth.error };

  if (orderedIds.length === 0) return { data: true, error: null };

  try {
    const supabase = createAdminClient();
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from("top_page_featured_videos")
        .update({ display_order: i })
        .eq("video_id", orderedIds[i])
        .eq("kind", kind);

      if (error) {
        console.error("reorderFeaturedVideosForTopPage error:", error);
        return { data: null, error: error.message };
      }
    }
    revalidatePath("/");
    return { data: true, error: null };
  } catch (e) {
    console.error("reorderFeaturedVideosForTopPage error:", e);
    return {
      data: null,
      error: e instanceof Error ? e.message : "並び替えに失敗しました"
    };
  }
}
