"use server";

import { after } from "next/server";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFullSiteUrl } from "@jobtv-app/shared/utils/dev-config";
import { translateAuthError } from "@jobtv-app/shared/auth";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";
import {
  sendEventReservationSlackNotification,
  appendEventReservationToSheet,
  sendEventReservationLinePush,
  type EventReservationSheetPayload,
} from "@/lib/email/send-event-reservation-notification";
import { buildCandidatePayloadFromFormData } from "@/lib/utils/candidate-payload";
import { resolveSchoolKcode } from "@/lib/actions/school-actions";
import { verifyTurnstileToken } from "@/lib/captcha/verify-turnstile";
import { logger } from "@/lib/logger";

/** DB の text[] カラムをフラットな string[] に正規化する（JSON 文字列混入対策） */
function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.flatMap((v) => {
    if (typeof v !== "string") return [];
    const trimmed = v.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch { /* not JSON */ }
    }
    return [v];
  });
}

export interface EventForReservation {
  id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue_name: string | null;
  display_name: string | null;
  form_label: string | null;
  form_area: string | null;
  gathering_time: string | null;
  venue_address: string | null;
  google_maps_url: string | null;
  event_types: {
    id: string;
    name: string;
    area: string | null;
  } | null;
}

/**
 * イベント一覧の内部取得関数（unstable_cache でラップして使う）
 */
async function fetchPublicEvents(
  eventTypeIdsJson: string,
  fromDays: string,
  toDays: string,
): Promise<{ data: EventForReservation[] | null; error: string | null }> {
  try {
    const supabase = createAdminClient();

    // JST 基準の今日
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = jstNow.toISOString().split("T")[0];

    let query = supabase
      .from("events")
      .select("id, event_date, start_time, end_time, venue_name, display_name, form_label, form_area, gathering_time, venue_address, google_maps_url, event_types(id, name, area)")
      .eq("status", "active")
      .is("deleted_at", null)
      .gte("event_date", todayStr)
      .order("event_date", { ascending: true });

    const eventTypeIds: string[] = eventTypeIdsJson ? JSON.parse(eventTypeIdsJson) : [];
    if (eventTypeIds.length) {
      query = query.in("event_type_id", eventTypeIds);
    }

    const fromDaysNum = fromDays ? Number(fromDays) : null;
    const toDaysNum = toDays ? Number(toDays) : null;

    if (fromDaysNum != null) {
      const from = new Date(jstNow.getTime() + fromDaysNum * 86400000);
      query = query.gte("event_date", from.toISOString().split("T")[0]);
    }

    if (toDaysNum != null) {
      const to = new Date(jstNow.getTime() + toDaysNum * 86400000);
      query = query.lte("event_date", to.toISOString().split("T")[0]);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ action: "getPublicEventsForReservation", err: error }, "イベント一覧の取得に失敗");
      return { data: null, error: "イベント情報の取得に失敗しました" };
    }

    const events: EventForReservation[] = (data ?? []).map((row) => ({
      id: row.id,
      event_date: row.event_date,
      start_time: row.start_time,
      end_time: row.end_time,
      venue_name: row.venue_name,
      display_name: row.display_name,
      form_label: row.form_label,
      form_area: row.form_area,
      gathering_time: row.gathering_time,
      venue_address: row.venue_address,
      google_maps_url: row.google_maps_url,
      event_types: Array.isArray(row.event_types) ? row.event_types[0] ?? null : row.event_types,
    }));

    return { data: events, error: null };
  } catch (e) {
    logger.error({ action: "getPublicEventsForReservation", err: e }, "イベント一覧取得で予期しないエラー");
    return { data: null, error: "イベント情報の取得に失敗しました" };
  }
}

/**
 * URL パラメータでフィルタしたイベント一覧を取得する（認証不要）
 * unstable_cache でキャッシュ（TTL 60秒、tag: "public-events"）
 */
export async function getPublicEventsForReservation(params: {
  eventTypeIds?: string[];
  fromDays?: number;
  toDays?: number;
}): Promise<{ data: EventForReservation[] | null; error: string | null }> {
  // unstable_cache はプリミティブ引数のみ受け付けるため JSON 文字列化
  const eventTypeIdsJson = params.eventTypeIds?.length ? JSON.stringify(params.eventTypeIds) : "";
  const fromDaysStr = params.fromDays != null ? String(params.fromDays) : "";
  const toDaysStr = params.toDays != null ? String(params.toDays) : "";

  const cached = unstable_cache(
    fetchPublicEvents,
    ["public-events", eventTypeIdsJson, fromDaysStr, toDaysStr],
    { revalidate: 60, tags: ["public-events"] },
  );

  return cached(eventTypeIdsJson, fromDaysStr, toDaysStr);
}

/**
 * ログイン済み candidate のイベント予約を作成する
 */
export async function createPublicEventReservation(formData: FormData): Promise<{
  data: { reservationId: string; eventId: string } | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "ログインが必要です" };
    }

    // candidate_id を取得
    const { data: profile } = await supabase
      .from("profiles")
      .select("candidate_id, role, last_name, first_name, email")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "candidate" || !profile.candidate_id) {
      return { data: null, error: "学生アカウントでログインしてください" };
    }

    const eventId = String(formData.get("event_id") ?? "").trim();
    if (!eventId) {
      return { data: null, error: "イベントを選択してください" };
    }

    const webConsultation = formData.get("web_consultation") === "true";

    // UTM パラメータ
    const referrer = formData.get("referrer") ? String(formData.get("referrer")) : null;
    const utmSource = formData.get("utm_source") ? String(formData.get("utm_source")) : null;
    const utmMedium = formData.get("utm_medium") ? String(formData.get("utm_medium")) : null;
    const utmCampaign = formData.get("utm_campaign") ? String(formData.get("utm_campaign")) : null;
    const utmContent = formData.get("utm_content") ? String(formData.get("utm_content")) : null;
    const utmTerm = formData.get("utm_term") ? String(formData.get("utm_term")) : null;

    // 重複チェック
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("event_reservations")
      .select("id")
      .eq("event_id", eventId)
      .eq("candidate_id", profile.candidate_id)
      .eq("status", "reserved")
      .maybeSingle();

    if (existing) {
      return { data: null, error: "すでにこのイベントに予約済みです" };
    }

    // 予約作成
    const { data: reservation, error: insertError } = await admin
      .from("event_reservations")
      .insert({
        event_id: eventId,
        candidate_id: profile.candidate_id,
        status: "reserved",
        web_consultation: webConsultation,
        referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
      })
      .select("id")
      .single();

    if (insertError || !reservation) {
      logger.error({ action: "createPublicEventReservation", err: insertError }, "予約の作成に失敗");
      return { data: null, error: "予約の作成に失敗しました" };
    }

    // 通知（fire-and-forget）
    fireReservationNotifications(eventId, profile.candidate_id, reservation.id, profile, webConsultation, {
      referrer, utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
    });

    revalidateTag("public-events", { expire: 0 });
    revalidatePath("/event/entry");
    return { data: { reservationId: reservation.id, eventId }, error: null };
  } catch (e) {
    logger.error({ action: "createPublicEventReservation", err: e }, "予約作成で予期しないエラー");
    return { data: null, error: "予約の作成に失敗しました" };
  }
}

/**
 * 既存 candidate のメールアドレスでイベント予約を作成する（ログイン不要）
 */
export async function createReservationForExistingCandidate(formData: FormData): Promise<{
  data: { eventId: string } | null;
  error: string | null;
}> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const eventId = String(formData.get("event_id") ?? "").trim();
  const captchaToken = String(formData.get("captchaToken") ?? "");

  if (!email || !eventId) {
    return { data: null, error: "必要な情報が不足しています" };
  }

  // Supabase Auth を経由しないため手動で Turnstile 検証
  const captchaResult = await verifyTurnstileToken(captchaToken);
  if (!captchaResult.success) {
    return { data: null, error: captchaResult.error ?? "CAPTCHA の検証に失敗しました" };
  }

  try {
    const admin = createAdminClient();

    // メールから candidate を特定
    const { data: profile } = await admin
      .from("profiles")
      .select("candidate_id, last_name, first_name, email")
      .eq("email", email)
      .eq("role", "candidate")
      .single();

    if (!profile?.candidate_id) {
      return { data: null, error: "アカウントが見つかりません" };
    }

    const webConsultation = formData.get("web_consultation") === "true";
    const referrer = formData.get("referrer") ? String(formData.get("referrer")) : null;
    const utmSource = formData.get("utm_source") ? String(formData.get("utm_source")) : null;
    const utmMedium = formData.get("utm_medium") ? String(formData.get("utm_medium")) : null;
    const utmCampaign = formData.get("utm_campaign") ? String(formData.get("utm_campaign")) : null;
    const utmContent = formData.get("utm_content") ? String(formData.get("utm_content")) : null;
    const utmTerm = formData.get("utm_term") ? String(formData.get("utm_term")) : null;

    // 重複チェック
    const { data: existing } = await admin
      .from("event_reservations")
      .select("id")
      .eq("event_id", eventId)
      .eq("candidate_id", profile.candidate_id)
      .eq("status", "reserved")
      .maybeSingle();

    if (existing) {
      return { data: null, error: "すでにこのイベントに予約済みです" };
    }

    // 予約作成
    const { data: reservation, error: insertError } = await admin
      .from("event_reservations")
      .insert({
        event_id: eventId,
        candidate_id: profile.candidate_id,
        status: "reserved",
        web_consultation: webConsultation,
        referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
      })
      .select("id")
      .single();

    if (insertError || !reservation) {
      logger.error({ action: "createReservationForExistingCandidate", err: insertError }, "予約の作成に失敗");
      return { data: null, error: "予約の作成に失敗しました" };
    }

    // 通知（fire-and-forget）
    fireReservationNotifications(eventId, profile.candidate_id, reservation.id, profile, webConsultation, {
      referrer, utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
    });

    revalidateTag("public-events", { expire: 0 });
    revalidatePath("/event/entry");
    return { data: { eventId }, error: null };
  } catch (e) {
    logger.error({ action: "createReservationForExistingCandidate", err: e }, "既存候補者の予約作成で予期しないエラー");
    return { data: null, error: "予約の作成に失敗しました" };
  }
}

/**
 * 未登録ユーザーの会員登録 + イベント予約を一括実行する
 */
export async function signUpAndReserveEvent(formData: FormData): Promise<{
  data: { eventId: string } | null;
  error: string | null;
}> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const eventId = String(formData.get("event_id") ?? "").trim();

  if (!eventId) {
    return { data: null, error: "イベントを選択してください" };
  }

  try {
    const supabase = await createClient();

    // 1. 認証アカウント作成
    const captchaToken = String(formData.get("captchaToken") ?? "");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${getFullSiteUrl(3000)}/api/auth/callback`, captchaToken },
    });

    if (authError) {
      return { data: null, error: translateAuthError(authError) };
    }

    if (!authData.session) {
      return {
        data: null,
        error: "メールアドレス確認のリンクを送信しました。メールをご確認のうえ、リンクから本登録を完了してください。",
      };
    }

    // 2. candidate 作成（RPC）
    const payload = buildCandidatePayloadFromFormData(formData, email);
    payload.user_id = authData.user?.id ?? null;
    if (!payload.school_kcode && payload.school_name) {
      payload.school_kcode = await resolveSchoolKcode(payload.school_name, payload.school_type);
    }

    const { error: rpcError } = await supabase.rpc("create_candidate_and_link_profile", {
      payload: payload as unknown as Record<string, unknown>,
    });

    if (rpcError) {
      logger.error({ action: "signUpAndReserveEvent", err: rpcError }, "候補者作成RPCに失敗");
      return { data: null, error: "登録情報の保存に失敗しました。しばらく経ってから再度お試しください。" };
    }

    // 3. candidate_id を取得
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("candidate_id, last_name, first_name, email")
      .eq("id", authData.user!.id)
      .single();

    if (!profile?.candidate_id) {
      logger.error({ action: "signUpAndReserveEvent" }, "候補者プロフィールが見つからない");
      return { data: null, error: "登録は完了しましたが、予約に失敗しました。ログイン後に再度お試しください。" };
    }

    // 4. 予約作成
    const webConsultation = formData.get("web_consultation") === "true";
    const referrer = formData.get("referrer") ? String(formData.get("referrer")) : null;
    const utmSource = formData.get("utm_source") ? String(formData.get("utm_source")) : null;
    const utmMedium = formData.get("utm_medium") ? String(formData.get("utm_medium")) : null;
    const utmCampaign = formData.get("utm_campaign") ? String(formData.get("utm_campaign")) : null;
    const utmContent = formData.get("utm_content") ? String(formData.get("utm_content")) : null;
    const utmTerm = formData.get("utm_term") ? String(formData.get("utm_term")) : null;

    const { data: reservation, error: insertError } = await admin
      .from("event_reservations")
      .insert({
        event_id: eventId,
        candidate_id: profile.candidate_id,
        status: "reserved",
        web_consultation: webConsultation,
        referrer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
      })
      .select("id")
      .single();

    if (insertError || !reservation) {
      logger.error({ action: "signUpAndReserveEvent", err: insertError }, "予約の作成に失敗");
      return { data: null, error: "登録は完了しましたが、予約に失敗しました。ログイン後に再度お試しください。" };
    }

    // 5. 通知（after() でレスポンス後に実行）
    after(async () => {
      try {
        await sendTemplatedEmail({
          templateName: "candidate_welcome",
          recipientEmail: email,
          variables: {
            first_name: payload.first_name,
            last_name: payload.last_name,
            site_url: getFullSiteUrl(3000),
          },
          recipientRole: "candidate",
        });
      } catch (e) {
        logger.error({ action: "signUpAndReserveEvent", err: e }, "ウェルカムメール送信に失敗");
      }

      const { sendSignupSlackNotification } = await import("@/lib/email/slack");
      const { appendCandidateToSheet } = await import("@/lib/google/sheets");
      sendSignupSlackNotification(payload).catch((e) =>
        logger.error({ action: "signUpAndReserveEvent", err: e }, "Slack会員登録通知に失敗")
      );
      appendCandidateToSheet(payload).catch((e) =>
        logger.error({ action: "signUpAndReserveEvent", err: e }, "Sheets会員登録転記に失敗")
      );
    });

    // 予約通知（fireReservationNotifications 内部でも after() を使用）
    fireReservationNotifications(eventId, profile.candidate_id, reservation.id, profile, webConsultation, {
      referrer, utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
    });

    revalidatePath("/", "layout");
    return { data: { eventId }, error: null };
  } catch (e) {
    logger.error({ action: "signUpAndReserveEvent", err: e }, "会員登録+予約で予期しないエラー");
    return { data: null, error: "処理に失敗しました。しばらく経ってから再度お試しください。" };
  }
}

/**
 * 予約関連の通知を after() で送信する（レスポンス後もランタイムが処理を継続する）
 */
function fireReservationNotifications(
  eventId: string,
  candidateId: string,
  reservationId: string,
  profile: { last_name: string | null; first_name: string | null; email: string | null },
  webConsultation: boolean,
  utm: {
    referrer: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
    utmTerm: string | null;
  }
): void {
  const siteUrl = getFullSiteUrl(3000);

  after(async () => {
    try {
      const admin = createAdminClient();

      // イベント・候補者・プロフィールを並列取得
      const [eventResult, candidateResult, fullProfileResult] = await Promise.all([
        admin
          .from("events")
          .select("event_date, start_time, end_time, venue_name, display_name, gathering_time, venue_address, google_maps_url, event_type_id, event_types(id, name, area, target_graduation_year)")
          .eq("id", eventId)
          .single(),
        admin
          .from("candidates")
          .select("phone, graduation_year, school_name, school_type, major_field, gender, desired_work_location, desired_industry, desired_job_type, line_user_id, created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer")
          .eq("id", candidateId)
          .single(),
        admin
          .from("profiles")
          .select("id, last_name_kana, first_name_kana")
          .eq("candidate_id", candidateId)
          .single(),
      ]);

      const { data: event, error: eventError } = eventResult;
      const { data: candidate, error: candidateError } = candidateResult;
      const { data: fullProfile, error: profileError } = fullProfileResult;

      if (eventError) {
        logger.error({ action: "fireReservationNotifications", err: eventError, eventId }, "イベント詳細の取得に失敗");
      }
      if (!event) return;

      if (candidateError) {
        logger.error({ action: "fireReservationNotifications", err: candidateError, candidateId }, "候補者詳細の取得に失敗");
      }
      if (profileError) {
        logger.error({ action: "fireReservationNotifications", err: profileError, candidateId }, "プロフィール詳細の取得に失敗");
      }

      const eventType = Array.isArray(event.event_types) ? event.event_types[0] : event.event_types;
      const eventTypeName = event.display_name || eventType?.name || "";
      const lastName = profile.last_name ?? "";
      const firstName = profile.first_name ?? "";
      const email = profile.email ?? "";

      // 予約確認メール
      sendTemplatedEmail({
        templateName: "event_reservation_confirmation",
        recipientEmail: email,
        variables: {
          first_name: firstName,
          last_name: lastName,
          event_type_name: eventTypeName,
          event_date: event.event_date,
          start_time: event.start_time,
          end_time: event.end_time,
          gathering_time: event.gathering_time ? event.gathering_time.slice(0, 5) : "",
          venue_name: event.venue_name ?? "",
          venue_address: event.venue_address ?? "",
          google_maps_url: event.google_maps_url ?? "",
          site_url: siteUrl,
        },
        recipientRole: "candidate",
      }).catch((e) => logger.error({ action: "fireReservationNotifications", err: e }, "予約確認メール送信に失敗"));

      const lastNameKana = fullProfile?.last_name_kana ?? "";
      const firstNameKana = fullProfile?.first_name_kana ?? "";
      const candidateNameKana = (lastNameKana || firstNameKana)
        ? `${lastNameKana} ${firstNameKana}`.trim()
        : "";

      const slackPayload = {
        candidateName: `${lastName} ${firstName}`,
        candidateNameKana,
        email,
        phone: candidate?.phone ?? "",
        graduationYear: candidate?.graduation_year ?? 0,
        schoolName: candidate?.school_name ?? "",
        eventTypeName,
        eventDate: event.event_date,
        startTime: event.start_time,
        endTime: event.end_time,
        venueName: event.venue_name ?? "",
        gatheringTime: event.gathering_time ? event.gathering_time.slice(0, 5) : "",
        venueAddress: event.venue_address ?? "",
        googleMapsUrl: event.google_maps_url ?? "",
        webConsultation,
        utmSource: utm.utmSource ?? "",
        utmMedium: utm.utmMedium ?? "",
        utmCampaign: utm.utmCampaign ?? "",
        utmContent: utm.utmContent ?? "",
        utmTerm: utm.utmTerm ?? "",
        referrer: utm.referrer ?? "",
      };

      // Slack 通知
      sendEventReservationSlackNotification(slackPayload).catch((e) =>
        logger.error({ action: "fireReservationNotifications", err: e }, "Slack予約通知に失敗")
      );

      // Google Sheets 追記（拡張ペイロード）
      const sheetPayload: EventReservationSheetPayload = {
        ...slackPayload,
        reservationId,
        eventId,
        eventTypeId: event.event_type_id ?? eventType?.id ?? "",
        targetGraduationYear: eventType?.target_graduation_year ?? null,
        area: eventType?.area ?? null,
        userId: fullProfile?.id ?? "",
        lastName,
        firstName,
        lastNameKana,
        firstNameKana,
        gender: candidate?.gender ?? "",
        desiredWorkLocation: normalizeStringArray(candidate?.desired_work_location),
        schoolType: candidate?.school_type ?? "",
        majorField: candidate?.major_field ?? "",
        desiredIndustry: normalizeStringArray(candidate?.desired_industry),
        desiredJobType: normalizeStringArray(candidate?.desired_job_type),
        candidateCreatedAt: candidate?.created_at ?? "",
        signupUtmSource: candidate?.utm_source ?? "",
        signupUtmMedium: candidate?.utm_medium ?? "",
        signupUtmCampaign: candidate?.utm_campaign ?? "",
        signupUtmContent: candidate?.utm_content ?? "",
        signupUtmTerm: candidate?.utm_term ?? "",
        signupReferrer: candidate?.referrer ?? "",
      };

      appendEventReservationToSheet(sheetPayload)
        .catch((e) => logger.error({ action: "fireReservationNotifications", err: e }, "Sheets予約転記に失敗"));

      // LINE push（連携済みの場合）
      if (candidate?.line_user_id) {
        sendEventReservationLinePush(candidate.line_user_id, {
          eventTypeName,
          eventDate: event.event_date,
          startTime: event.start_time,
          endTime: event.end_time,
          venueName: event.venue_name ?? "",
          gatheringTime: event.gathering_time ? event.gathering_time.slice(0, 5) : "",
          venueAddress: event.venue_address ?? "",
          googleMapsUrl: event.google_maps_url ?? "",
        }).catch((e) => logger.error({ action: "fireReservationNotifications", err: e }, "LINE予約通知に失敗"));
      }

    } catch (e) {
      logger.error({ action: "fireReservationNotifications", err: e }, "予約通知処理で予期しないエラー");
    }
  });
}
