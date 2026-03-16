import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { executeBroadcast } from "@/lib/actions/line-broadcast-actions";
import type { LineBroadcastFilters } from "@/lib/actions/line-broadcast-actions";
import type { LineMessage } from "@/types/line-flex.types";

/**
 * Vercel Cron: 5分ごとに予約済み LINE 配信を実行する
 * Schedule: *​/5 * * * *
 */
export async function GET(request: NextRequest) {
  // CRON_SECRET で認証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let processed = 0;
  let failed = 0;

  try {
    const supabase = createAdminClient();

    // 予約時刻を過ぎた scheduled 状態の配信を取得
    const { data: scheduledLogs, error: queryError } = await supabase
      .from("line_broadcast_logs")
      .select("id, filters_snapshot, messages_snapshot")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString());

    if (queryError) {
      logger.error(
        { action: "cron/line-broadcast", err: queryError },
        "予約配信の取得に失敗"
      );
      return NextResponse.json(
        { error: "Failed to fetch scheduled broadcasts" },
        { status: 500 }
      );
    }

    if (!scheduledLogs?.length) {
      return NextResponse.json({ ok: true, processed: 0, failed: 0 });
    }

    for (const log of scheduledLogs) {
      try {
        const filters = (log.filters_snapshot ?? {}) as LineBroadcastFilters;
        const messages = (log.messages_snapshot ?? []) as unknown as LineMessage[];

        await executeBroadcast(log.id, filters, messages);
        processed++;
      } catch (e) {
        failed++;
        logger.error(
          { action: "cron/line-broadcast", err: e, broadcastLogId: log.id },
          "予約配信の実行に失敗"
        );

        // ログのステータスを failed に更新
        await supabase
          .from("line_broadcast_logs")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", log.id);
      }
    }

    logger.info(
      { action: "cron/line-broadcast", processed, failed },
      "予約LINE配信の処理完了"
    );

    return NextResponse.json({ ok: true, processed, failed });
  } catch (e) {
    logger.error(
      { action: "cron/line-broadcast", err: e },
      "予約LINE配信の処理で予期しないエラー"
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
