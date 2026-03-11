"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Tables } from "@jobtv-app/shared/types";
import { checkAdminPermission } from "@/lib/actions/admin-actions";
import { logger } from "@/lib/logger";
import { logAudit } from "@jobtv-app/shared/utils/audit";
import { createClient } from "@/lib/supabase/server";

type Event = Tables<"events">;
type EventType = Tables<"event_types">;
type EventArea = Tables<"event_areas">;
type EventGraduationYear = Tables<"event_graduation_years">;
type EventCompany = Tables<"event_companies">;
type EventReservation = Tables<"event_reservations">;

// ── マスタ取得（認証不要） ──

export async function getEventTypes(): Promise<{
  data: EventType[] | null;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_types")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      logger.error({ action: "getEventTypes", err: error }, "イベントタイプの取得に失敗しました");
      return { data: null, error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    logger.error({ action: "getEventTypes", err }, "イベントタイプの取得中に例外が発生しました");
    return { data: null, error: err instanceof Error ? err.message : "イベントタイプの取得に失敗しました" };
  }
}

export async function getEventAreas(): Promise<{
  data: EventArea[] | null;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_areas")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      logger.error({ action: "getEventAreas", err: error }, "エリアの取得に失敗しました");
      return { data: null, error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    logger.error({ action: "getEventAreas", err }, "エリアの取得中に例外が発生しました");
    return { data: null, error: err instanceof Error ? err.message : "エリアの取得に失敗しました" };
  }
}

export async function getEventGraduationYears(): Promise<{
  data: EventGraduationYear[] | null;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_graduation_years")
      .select("*")
      .order("year", { ascending: false });

    if (error) {
      logger.error({ action: "getEventGraduationYears", err: error }, "卒業年度の取得に失敗しました");
      return { data: null, error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    logger.error({ action: "getEventGraduationYears", err }, "卒業年度の取得中に例外が発生しました");
    return { data: null, error: err instanceof Error ? err.message : "卒業年度の取得に失敗しました" };
  }
}

// ── イベント一覧 ──

export async function getEvents(params: {
  limit: number;
  offset: number;
  area?: string;
  graduationYear?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "date_asc" | "date_desc";
  status?: string;
}): Promise<{
  data: (Event & { event_types: EventType | null })[] | null;
  count: number | null;
  error: string | null;
}> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("events")
      .select("*, event_types(*)", { count: "exact" })
      .is("deleted_at", null);

    if (params.area) {
      query = query.eq("event_types.area", params.area);
    }
    if (params.graduationYear) {
      query = query.eq("event_types.target_graduation_year", params.graduationYear);
    }
    if (params.dateFrom) {
      query = query.gte("event_date", params.dateFrom);
    }
    if (params.dateTo) {
      query = query.lte("event_date", params.dateTo);
    }
    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.sortBy === "date_asc") {
      query = query.order("event_date", { ascending: true });
    } else {
      query = query.order("event_date", { ascending: false });
    }

    query = query.range(params.offset, params.offset + params.limit - 1);

    const { data, count, error } = await query;

    if (error) {
      logger.error({ action: "getEvents", err: error }, "イベント一覧の取得に失敗しました");
      return { data: null, count: null, error: error.message };
    }

    return { data: data || [], count: count ?? 0, error: null };
  } catch (err) {
    logger.error({ action: "getEvents", err }, "イベント一覧の取得中に例外が発生しました");
    return { data: null, count: null, error: err instanceof Error ? err.message : "イベント一覧の取得に失敗しました" };
  }
}

// ── イベント詳細 ──

export async function getEventById(eventId: string): Promise<{
  data: (Event & { event_types: EventType | null }) | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select("*, event_types(*)")
      .eq("id", eventId)
      .is("deleted_at", null)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "イベントの取得に失敗しました" };
  }
}

// ── イベント作成 ──

export async function createEvent(data: {
  event_type_id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  gathering_time?: string | null;
  display_name?: string | null;
  target_attendance?: number | null;
  venue_address?: string | null;
  google_maps_url?: string | null;
  form_label?: string | null;
  form_area?: string | null;
  status?: string;
}): Promise<{ data: { eventId: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const supabaseAdmin = createAdminClient();
    const { data: newEvent, error } = await supabaseAdmin
      .from("events")
      .insert({
        event_type_id: data.event_type_id,
        event_date: data.event_date,
        start_time: data.start_time,
        end_time: data.end_time,
        gathering_time: data.gathering_time || null,
        display_name: data.display_name || null,
        target_attendance: data.target_attendance || null,
        venue_address: data.venue_address || null,
        google_maps_url: data.google_maps_url || null,
        form_label: data.form_label || null,
        form_area: data.form_area || null,
        status: data.status || "active",
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error || !newEvent) {
      logger.error({ action: "createEvent", err: error }, "イベントの作成に失敗しました");
      return { data: null, error: error?.message ?? "イベントの作成に失敗しました" };
    }

    revalidatePath("/admin/events");

    if (user) {
      logAudit({
        userId: user.id,
        action: "event.create",
        category: "content_edit",
        resourceType: "events",
        resourceId: newEvent.id,
        app: "jobtv",
        metadata: { eventDate: data.event_date },
      });
    }

    return { data: { eventId: newEvent.id }, error: null };
  } catch (err) {
    logger.error({ action: "createEvent", err }, "イベント作成中に例外が発生しました");
    return { data: null, error: err instanceof Error ? err.message : "イベントの作成に失敗しました" };
  }
}

// ── イベント更新 ──

export async function updateEvent(
  eventId: string,
  data: {
    event_type_id?: string;
    event_date?: string;
    start_time?: string;
    end_time?: string;
    gathering_time?: string | null;
    display_name?: string | null;
    target_attendance?: number | null;
    venue_address?: string | null;
    google_maps_url?: string | null;
    form_label?: string | null;
    form_area?: string | null;
    status?: string;
  }
): Promise<{ data: { eventId: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("events")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", eventId);

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath("/admin/events");
    revalidatePath(`/admin/events/${eventId}`);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({
        userId: user.id,
        action: "event.update",
        category: "content_edit",
        resourceType: "events",
        resourceId: eventId,
        app: "jobtv",
        metadata: { changedFields: Object.keys(data) },
      });
    }

    return { data: { eventId }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "イベントの更新に失敗しました" };
  }
}

// ── イベント削除 ──

export async function deleteEvent(eventId: string): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { error: "管理者権限が必要です" };
  }
  try {
    const supabaseAdmin = createAdminClient();

    // 論理削除: deleted_at をセット
    const { error } = await supabaseAdmin
      .from("events")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", eventId)
      .is("deleted_at", null);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({
        userId: user.id,
        action: "event.soft_delete",
        category: "content_edit",
        resourceType: "events",
        resourceId: eventId,
        app: "jobtv",
      });
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "イベントの削除に失敗しました" };
  }
}

// ── 参加企業 ──

export async function getEventCompanies(eventId: string): Promise<{
  data: (EventCompany & { companies: Tables<"companies"> | null })[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_companies")
      .select("*, companies(*)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "参加企業の取得に失敗しました" };
  }
}

export async function addEventCompany(
  eventId: string,
  companyId: string
): Promise<{ data: { id: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }
  try {
    const supabaseAdmin = createAdminClient();

    // 重複チェック
    const { data: existing } = await supabaseAdmin
      .from("event_companies")
      .select("id")
      .eq("event_id", eventId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existing) {
      return { data: null, error: "この企業は既に追加されています" };
    }

    const { data, error } = await supabaseAdmin
      .from("event_companies")
      .insert({ event_id: eventId, company_id: companyId })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    revalidatePath(`/admin/events/${eventId}`);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({
        userId: user.id,
        action: "event_company.add",
        category: "content_edit",
        resourceType: "event_companies",
        resourceId: data.id,
        app: "jobtv",
        metadata: { eventId, companyId },
      });
    }

    return { data: { id: data.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "企業の追加に失敗しました" };
  }
}

export async function removeEventCompany(eventCompanyId: string): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { error: "管理者権限が必要です" };
  }
  try {
    const supabaseAdmin = createAdminClient();

    // 削除前にevent_idを取得（revalidate用）
    const { data: record } = await supabaseAdmin
      .from("event_companies")
      .select("event_id")
      .eq("id", eventCompanyId)
      .single();

    const { error } = await supabaseAdmin
      .from("event_companies")
      .delete()
      .eq("id", eventCompanyId);

    if (error) {
      return { error: error.message };
    }

    if (record) {
      revalidatePath(`/admin/events/${record.event_id}`);
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({
        userId: user.id,
        action: "event_company.remove",
        category: "content_edit",
        resourceType: "event_companies",
        resourceId: eventCompanyId,
        app: "jobtv",
      });
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "企業の削除に失敗しました" };
  }
}

export async function searchCompanies(query: string): Promise<{
  data: Tables<"companies">[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, error: "管理者権限が必要です" };
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", `%${query}%`)
      .limit(20);

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "企業検索に失敗しました" };
  }
}

// ── 予約一覧 ──

export type ReservationWithProfile = EventReservation & {
  candidates: Tables<"candidates"> | null;
  profile: { last_name: string | null; first_name: string | null; email: string | null } | null;
};

export async function getEventReservations(
  eventId: string,
  params: { limit: number; offset: number }
): Promise<{
  data: ReservationWithProfile[] | null;
  count: number | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { data: null, count: null, error: "管理者権限が必要です" };
  }
  try {
    const supabase = createAdminClient();
    const { data, count, error } = await supabase
      .from("event_reservations")
      .select("*, candidates(*)", { count: "exact" })
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (error) {
      return { data: null, count: null, error: error.message };
    }

    // candidate_id から profiles を取得して名前・メールを付与
    const candidateIds = (data || []).map((r) => r.candidate_id).filter(Boolean);
    let profileMap = new Map<string, { last_name: string | null; first_name: string | null; email: string | null }>();

    if (candidateIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, last_name, first_name, email")
        .in("id", candidateIds);

      if (profiles) {
        profileMap = new Map(profiles.map((p) => [p.id, { last_name: p.last_name, first_name: p.first_name, email: p.email }]));
      }
    }

    const result: ReservationWithProfile[] = (data || []).map((r) => ({
      ...r,
      profile: profileMap.get(r.candidate_id) || null,
    }));

    return { data: result, count: count ?? 0, error: null };
  } catch (err) {
    return { data: null, count: null, error: err instanceof Error ? err.message : "予約一覧の取得に失敗しました" };
  }
}

export async function updateReservationAttendance(
  id: string,
  attended: boolean
): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) {
    return { error: "管理者権限が必要です" };
  }
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("event_reservations")
      .update({ attended, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({
        userId: user.id,
        action: "reservation.attendance",
        category: "content_edit",
        resourceType: "event_reservations",
        resourceId: id,
        app: "jobtv",
        metadata: { attended },
      });
    }

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "出欠の更新に失敗しました" };
  }
}

// ── マスタデータ管理（admin 専用 CRUD） ──

// --- エリア ---

export async function getAllEventAreas(): Promise<{
  data: EventArea[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_areas")
      .select("*")
      .order("name", { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "エリアの取得に失敗しました" };
  }
}

export async function createEventArea(params: {
  name: string;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    // 重複チェック
    const { data: existing } = await supabaseAdmin
      .from("event_areas")
      .select("id")
      .eq("name", params.name.trim())
      .maybeSingle();
    if (existing) return { data: null, error: "同じ名前のエリアが既に存在します" };

    const { data, error } = await supabaseAdmin
      .from("event_areas")
      .insert({ name: params.name.trim() })
      .select()
      .single();
    if (error || !data) return { data: null, error: error?.message ?? "エリアの作成に失敗しました" };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_area.create", category: "content_edit", resourceType: "event_areas", resourceId: data.id, app: "jobtv", metadata: { name: params.name } });
    }
    return { data: { id: data.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "エリアの作成に失敗しました" };
  }
}

export async function updateEventArea(
  id: string,
  params: { name?: string; is_active?: boolean }
): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    // 名前変更時: 重複チェック + FK 使用チェック
    if (params.name !== undefined) {
      const { data: existing } = await supabaseAdmin
        .from("event_areas")
        .select("id")
        .eq("name", params.name.trim())
        .neq("id", id)
        .maybeSingle();
      if (existing) return { error: "同じ名前のエリアが既に存在します" };

      // 旧名を取得
      const { data: current } = await supabaseAdmin
        .from("event_areas")
        .select("name")
        .eq("id", id)
        .single();
      if (current && current.name !== params.name.trim()) {
        const { count } = await supabaseAdmin
          .from("event_types")
          .select("id", { count: "exact", head: true })
          .eq("area", current.name);
        if (count && count > 0) {
          return { error: `このエリアは${count}件のイベントタイプで使用中のため名前を変更できません` };
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.is_active !== undefined) updateData.is_active = params.is_active;

    const { error } = await supabaseAdmin.from("event_areas").update(updateData).eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_area.update", category: "content_edit", resourceType: "event_areas", resourceId: id, app: "jobtv", metadata: { changedFields: Object.keys(params) } });
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "エリアの更新に失敗しました" };
  }
}

export async function deleteEventArea(id: string): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    // FK チェック: event_types.area で使用中か
    const { data: area } = await supabaseAdmin
      .from("event_areas")
      .select("name")
      .eq("id", id)
      .single();
    if (area) {
      const { count } = await supabaseAdmin
        .from("event_types")
        .select("id", { count: "exact", head: true })
        .eq("area", area.name);
      if (count && count > 0) {
        return { error: `このエリアは${count}件のイベントタイプで使用中のため削除できません` };
      }
    }

    const { error } = await supabaseAdmin.from("event_areas").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_area.delete", category: "content_edit", resourceType: "event_areas", resourceId: id, app: "jobtv" });
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "エリアの削除に失敗しました" };
  }
}

// --- 卒業年度 ---

export async function getAllEventGraduationYears(): Promise<{
  data: EventGraduationYear[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_graduation_years")
      .select("*")
      .order("year", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "卒業年度の取得に失敗しました" };
  }
}

export async function createEventGraduationYear(params: {
  year: number;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    const { data: existing } = await supabaseAdmin
      .from("event_graduation_years")
      .select("id")
      .eq("year", params.year)
      .maybeSingle();
    if (existing) return { data: null, error: "同じ卒業年度が既に存在します" };

    const { data, error } = await supabaseAdmin
      .from("event_graduation_years")
      .insert({ year: params.year })
      .select()
      .single();
    if (error || !data) return { data: null, error: error?.message ?? "卒業年度の作成に失敗しました" };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_graduation_year.create", category: "content_edit", resourceType: "event_graduation_years", resourceId: data.id, app: "jobtv", metadata: { year: params.year } });
    }
    return { data: { id: data.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "卒業年度の作成に失敗しました" };
  }
}

export async function updateEventGraduationYear(
  id: string,
  params: { year?: number; is_active?: boolean }
): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    if (params.year !== undefined) {
      const { data: existing } = await supabaseAdmin
        .from("event_graduation_years")
        .select("id")
        .eq("year", params.year)
        .neq("id", id)
        .maybeSingle();
      if (existing) return { error: "同じ卒業年度が既に存在します" };

      const { data: current } = await supabaseAdmin
        .from("event_graduation_years")
        .select("year")
        .eq("id", id)
        .single();
      if (current && current.year !== params.year) {
        const { count } = await supabaseAdmin
          .from("event_types")
          .select("id", { count: "exact", head: true })
          .eq("target_graduation_year", current.year);
        if (count && count > 0) {
          return { error: `この卒業年度は${count}件のイベントタイプで使用中のため値を変更できません` };
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    if (params.year !== undefined) updateData.year = params.year;
    if (params.is_active !== undefined) updateData.is_active = params.is_active;

    const { error } = await supabaseAdmin.from("event_graduation_years").update(updateData).eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_graduation_year.update", category: "content_edit", resourceType: "event_graduation_years", resourceId: id, app: "jobtv", metadata: { changedFields: Object.keys(params) } });
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "卒業年度の更新に失敗しました" };
  }
}

export async function deleteEventGraduationYear(id: string): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    const { data: year } = await supabaseAdmin
      .from("event_graduation_years")
      .select("year")
      .eq("id", id)
      .single();
    if (year) {
      const { count } = await supabaseAdmin
        .from("event_types")
        .select("id", { count: "exact", head: true })
        .eq("target_graduation_year", year.year);
      if (count && count > 0) {
        return { error: `この卒業年度は${count}件のイベントタイプで使用中のため削除できません` };
      }
    }

    const { error } = await supabaseAdmin.from("event_graduation_years").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_graduation_year.delete", category: "content_edit", resourceType: "event_graduation_years", resourceId: id, app: "jobtv" });
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "卒業年度の削除に失敗しました" };
  }
}

// --- イベントタイプ ---

export async function getAllEventTypes(): Promise<{
  data: EventType[] | null;
  error: string | null;
}> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("event_types")
      .select("*")
      .order("name", { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data || [], error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "イベントタイプの取得に失敗しました" };
  }
}

export async function createEventType(params: {
  name: string;
  area?: string;
  target_graduation_year?: number;
}): Promise<{ data: { id: string } | null; error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { data: null, error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("event_types")
      .insert({
        name: params.name.trim(),
        area: params.area || null,
        target_graduation_year: params.target_graduation_year || null,
      })
      .select()
      .single();
    if (error || !data) return { data: null, error: error?.message ?? "イベントタイプの作成に失敗しました" };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_type.create", category: "content_edit", resourceType: "event_types", resourceId: data.id, app: "jobtv", metadata: { name: params.name } });
    }
    return { data: { id: data.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "イベントタイプの作成に失敗しました" };
  }
}

export async function updateEventType(
  id: string,
  params: { name?: string; area?: string | null; target_graduation_year?: number | null; is_active?: boolean }
): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (params.name !== undefined) updateData.name = params.name.trim();
    if (params.area !== undefined) updateData.area = params.area || null;
    if (params.target_graduation_year !== undefined) updateData.target_graduation_year = params.target_graduation_year;
    if (params.is_active !== undefined) updateData.is_active = params.is_active;

    const { error } = await supabaseAdmin.from("event_types").update(updateData).eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_type.update", category: "content_edit", resourceType: "event_types", resourceId: id, app: "jobtv", metadata: { changedFields: Object.keys(params) } });
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "イベントタイプの更新に失敗しました" };
  }
}

export async function deleteEventType(id: string): Promise<{ error: string | null }> {
  const { isAdmin } = await checkAdminPermission();
  if (!isAdmin) return { error: "管理者権限が必要です" };
  try {
    const supabaseAdmin = createAdminClient();

    const { count } = await supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("event_type_id", id);
    if (count && count > 0) {
      return { error: `このイベントタイプは${count}件のイベントで使用中のため削除できません` };
    }

    const { error } = await supabaseAdmin.from("event_types").delete().eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/admin/events");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logAudit({ userId: user.id, action: "event_type.delete", category: "content_edit", resourceType: "event_types", resourceId: id, app: "jobtv" });
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "イベントタイプの削除に失敗しました" };
  }
}
