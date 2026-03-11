import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTemplatedEmail } from "@/lib/email/send-templated-email";
import { sendEventReservationLinePush } from "@/lib/email/send-event-reservation-notification";
import { logger } from "@/lib/logger";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jobtv.jp";

const REMINDER_CONFIG = [
  { days: 7, templateName: "event_reservation_reminder_7d" },
  { days: 3, templateName: "event_reservation_reminder_3d" },
  { days: 1, templateName: "event_reservation_reminder_1d" },
] as const;

/**
 * Vercel Cron: 毎朝 JST 10:00 (UTC 01:00) にイベントリマインドを送信する
 * Schedule: 0 1 * * *
 */
export async function GET(request: NextRequest) {
  // CRON_SECRET で認証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // JST 基準の今日の日付
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const todayStr = jstNow.toISOString().split("T")[0];

    // 対象日付を算出（7日後、3日後、1日後）
    const targetDates = REMINDER_CONFIG.map((config) => {
      const target = new Date(jstNow.getTime() + config.days * 86400000);
      return {
        ...config,
        targetDate: target.toISOString().split("T")[0],
      };
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const { targetDate, templateName, days } of targetDates) {
      // 対象の予約を取得（status=reserved かつ指定日のイベント）
      const { data: reservations, error: queryError } = await supabase
        .from("event_reservations")
        .select(`
          id,
          candidate_id,
          last_reminder_sent_at,
          events!inner(
            event_date,
            start_time,
            end_time,
            venue_name,
            display_name,
            gathering_time,
            venue_address,
            google_maps_url,
            status,
            event_types(name)
          )
        `)
        .eq("status", "reserved")
        .eq("events.event_date", targetDate)
        .neq("events.status", "cancelled");

      if (queryError) {
        logger.error(
          { action: "event-reminder", err: queryError, targetDate },
          "リマインド対象の取得に失敗"
        );
        continue;
      }

      if (!reservations?.length) continue;

      for (const reservation of reservations) {
        // 重複送信防止: 今日すでに送信済みの場合はスキップ
        if (reservation.last_reminder_sent_at) {
          const lastSent = new Date(reservation.last_reminder_sent_at);
          const lastSentJst = new Date(lastSent.getTime() + jstOffset);
          if (lastSentJst.toISOString().split("T")[0] === todayStr) {
            continue;
          }
        }

        // candidate の情報を取得
        const { data: candidateProfile } = await supabase
          .from("profiles")
          .select("last_name, first_name, email")
          .eq("candidate_id", reservation.candidate_id)
          .single();

        if (!candidateProfile?.email) continue;

        const event = Array.isArray(reservation.events)
          ? reservation.events[0]
          : reservation.events;
        if (!event) continue;

        const eventType = Array.isArray(event.event_types)
          ? event.event_types[0]
          : event.event_types;
        const eventTypeName = event.display_name || eventType?.name || "";

        // メール送信
        try {
          await sendTemplatedEmail({
            templateName,
            recipientEmail: candidateProfile.email,
            variables: {
              first_name: candidateProfile.first_name ?? "",
              last_name: candidateProfile.last_name ?? "",
              event_type_name: eventTypeName,
              event_date: event.event_date,
              start_time: event.start_time,
              end_time: event.end_time,
              gathering_time: event.gathering_time ? event.gathering_time.slice(0, 5) : "",
              venue_name: event.venue_name ?? "",
              venue_address: event.venue_address ?? "",
              google_maps_url: event.google_maps_url ?? "",
              site_url: SITE_URL,
            },
            recipientRole: "candidate",
          });
          totalSent++;
        } catch (e) {
          totalFailed++;
          logger.error(
            { action: "event-reminder", err: e, reservationId: reservation.id },
            "リマインドメール送信に失敗"
          );
        }

        // LINE push（候補者に line_user_id がある場合）
        const { data: candidate } = await supabase
          .from("candidates")
          .select("line_user_id")
          .eq("id", reservation.candidate_id)
          .single();

        if (candidate?.line_user_id) {
          const lineText =
            days === 1
              ? "イベントはいよいよ明日です！"
              : `イベントまであと${days}日です`;

          sendEventReservationLinePush(candidate.line_user_id, {
            eventTypeName: eventTypeName,
            eventDate: event.event_date,
            startTime: event.start_time,
            endTime: event.end_time,
            venueName: event.venue_name ?? "",
            gatheringTime: event.gathering_time ? event.gathering_time.slice(0, 5) : "",
            venueAddress: event.venue_address ?? "",
            googleMapsUrl: event.google_maps_url ?? "",
          }).catch((e) =>
            logger.error(
              { action: "event-reminder", err: e, reservationId: reservation.id },
              `LINEリマインド送信に失敗 (${lineText})`
            )
          );
        }

        // last_reminder_sent_at を更新
        await supabase
          .from("event_reservations")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", reservation.id);
      }
    }

    logger.info(
      { action: "event-reminder", sent: totalSent, failed: totalFailed },
      "イベントリマインド処理完了"
    );

    return NextResponse.json({
      ok: true,
      sent: totalSent,
      failed: totalFailed,
    });
  } catch (e) {
    logger.error({ action: "event-reminder", err: e }, "イベントリマインド処理で予期しないエラー");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
