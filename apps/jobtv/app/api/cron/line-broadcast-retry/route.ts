import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { LineMessage } from "@/types/line-flex.types";

const RETRY_INTERVAL_MINUTES = 5;
const MAX_RETRY_COUNT = 3;

/**
 * Vercel Cron: 15分ごとに失敗した LINE 配信を再試行する
 * Schedule: *​/15 * * * *
 */
export async function GET(request: NextRequest) {
  // CRON_SECRET で認証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    logger.error(
      { action: "cron/line-broadcast-retry" },
      "LINE_CHANNEL_ACCESS_TOKEN が未設定"
    );
    return NextResponse.json(
      { error: "LINE_CHANNEL_ACCESS_TOKEN not configured" },
      { status: 500 }
    );
  }

  let retried = 0;
  let success = 0;
  let failed = 0;

  try {
    const supabase = createAdminClient();

    // リトライ対象の配信を取得（failed かつ retry_count < MAX_RETRY_COUNT）
    const { data: failedDeliveries, error: queryError } = await supabase
      .from("line_broadcast_deliveries")
      .select("id, broadcast_log_id, line_user_id, retry_count, last_attempted_at")
      .eq("status", "failed")
      .lt("retry_count", MAX_RETRY_COUNT);

    if (queryError) {
      logger.error(
        { action: "cron/line-broadcast-retry", err: queryError },
        "リトライ対象の取得に失敗"
      );
      return NextResponse.json(
        { error: "Failed to fetch failed deliveries" },
        { status: 500 }
      );
    }

    if (!failedDeliveries?.length) {
      return NextResponse.json({
        ok: true,
        retried: 0,
        success: 0,
        failed: 0,
      });
    }

    const now = new Date();

    // 親ログのメッセージをキャッシュ（同一配信の複数 delivery で再利用）
    const messagesCache = new Map<string, LineMessage[]>();

    for (const delivery of failedDeliveries) {
      // バックオフ判定: last_attempted_at + retry_count * RETRY_INTERVAL_MINUTES 分 が経過しているか
      if (delivery.last_attempted_at) {
        const lastAttempted = new Date(delivery.last_attempted_at);
        const backoffMs =
          (delivery.retry_count ?? 0) * RETRY_INTERVAL_MINUTES * 60 * 1000;
        const nextRetryAt = new Date(lastAttempted.getTime() + backoffMs);
        if (now < nextRetryAt) {
          continue; // まだリトライ時間に達していない
        }
      }

      // 親ログからメッセージを取得
      let messages = messagesCache.get(delivery.broadcast_log_id);
      if (!messages) {
        const { data: logData } = await supabase
          .from("line_broadcast_logs")
          .select("messages_snapshot")
          .eq("id", delivery.broadcast_log_id)
          .single();

        if (!logData?.messages_snapshot) {
          logger.error(
            {
              action: "cron/line-broadcast-retry",
              broadcastLogId: delivery.broadcast_log_id,
            },
            "親ログのメッセージが見つかりません"
          );
          continue;
        }

        messages = logData.messages_snapshot as unknown as LineMessage[];
        messagesCache.set(delivery.broadcast_log_id, messages);
      }

      retried++;
      const currentRetryCount = (delivery.retry_count ?? 0) + 1;
      const attemptedAt = now.toISOString();

      try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: delivery.line_user_id,
            messages,
          }),
        });

        if (res.ok) {
          success++;
          await supabase
            .from("line_broadcast_deliveries")
            .update({
              status: "success",
              retry_count: currentRetryCount,
              last_attempted_at: attemptedAt,
            })
            .eq("id", delivery.id);
        } else {
          const errBody = await res.text();
          const isPermanentError = [400, 401, 403].includes(res.status);

          if (isPermanentError) {
            // 恒久エラー -> blocked
            await supabase
              .from("line_broadcast_deliveries")
              .update({
                status: "blocked",
                retry_count: currentRetryCount,
                error_code: res.status.toString(),
                error_message: errBody.slice(0, 500),
                last_attempted_at: attemptedAt,
              })
              .eq("id", delivery.id);
          } else {
            // リトライ可能エラー -> failed のまま retry_count を更新
            failed++;
            await supabase
              .from("line_broadcast_deliveries")
              .update({
                status: "failed",
                retry_count: currentRetryCount,
                error_code: res.status.toString(),
                error_message: errBody.slice(0, 500),
                last_attempted_at: attemptedAt,
              })
              .eq("id", delivery.id);
          }

          logger.error(
            {
              action: "cron/line-broadcast-retry",
              deliveryId: delivery.id,
              status: res.status,
              body: errBody.slice(0, 200),
              retryCount: currentRetryCount,
            },
            "リトライ送信に失敗"
          );
        }
      } catch (e) {
        failed++;
        await supabase
          .from("line_broadcast_deliveries")
          .update({
            status: "failed",
            retry_count: currentRetryCount,
            error_message:
              e instanceof Error ? e.message.slice(0, 500) : "Unknown error",
            last_attempted_at: attemptedAt,
          })
          .eq("id", delivery.id);

        logger.error(
          {
            action: "cron/line-broadcast-retry",
            err: e,
            deliveryId: delivery.id,
            retryCount: currentRetryCount,
          },
          "リトライ送信で例外発生"
        );
      }
    }

    // 親ログのカウントを更新（影響のあったログ ID ごと）
    const affectedLogIds = new Set(
      failedDeliveries.map((d) => d.broadcast_log_id)
    );

    for (const logId of affectedLogIds) {
      const { data: counts } = await supabase
        .from("line_broadcast_deliveries")
        .select("status")
        .eq("broadcast_log_id", logId);

      if (counts) {
        const sentCount = counts.filter((c) => c.status === "success").length;
        const failedCount = counts.filter((c) => c.status === "failed").length;
        const blockedCount = counts.filter(
          (c) => c.status === "blocked"
        ).length;

        await supabase
          .from("line_broadcast_logs")
          .update({
            sent_count: sentCount,
            failed_count: failedCount,
            blocked_count: blockedCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }
    }

    logger.info(
      { action: "cron/line-broadcast-retry", retried, success, failed },
      "LINE配信リトライ処理完了"
    );

    return NextResponse.json({ ok: true, retried, success, failed });
  } catch (e) {
    logger.error(
      { action: "cron/line-broadcast-retry", err: e },
      "LINE配信リトライ処理で予期しないエラー"
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
