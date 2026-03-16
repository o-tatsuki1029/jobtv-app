import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { executeApprovedDeletions } from "@/lib/storage/deletion-queue";
import { executeFullScan } from "@/lib/actions/storage-cleanup-actions";
import { logger } from "@/lib/logger";

/**
 * Vercel Cron: 毎日 AM 3:00 (UTC) に実行
 * 1. 予約済みフルスキャンのうち実行時刻を過ぎたものを実行
 * 2. 承認済みキューアイテムを実行
 * Schedule: 0 3 * * *
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // 1. 実行時刻を過ぎた pending スケジュールを処理
    const { data: dueSchedules } = await supabase
      .from("storage_cleanup_schedules")
      .select("id")
      .eq("status", "pending")
      .lte("scheduled_at", now);

    let scannedCount = 0;
    let scanOrphanedTotal = 0;

    for (const schedule of dueSchedules ?? []) {
      const result = await executeFullScan(schedule.id);
      scannedCount++;
      scanOrphanedTotal += result.orphanedCount;
    }

    // 2. 承認済みキューアイテムを実行
    const execResult = await executeApprovedDeletions();

    logger.info(
      {
        action: "storage-cleanup-cron",
        scannedSchedules: scannedCount,
        scanOrphaned: scanOrphanedTotal,
        ...execResult,
      },
      "ストレージクリーンアップCron完了"
    );

    return NextResponse.json({
      ok: true,
      scannedSchedules: scannedCount,
      scanOrphaned: scanOrphanedTotal,
      deletionsProcessed: execResult.processed,
      deletionsSucceeded: execResult.succeeded,
      deletionsFailed: execResult.failed,
    });
  } catch (e) {
    logger.error({ action: "storage-cleanup-cron", err: e }, "ストレージクリーンアップCronで予期しないエラー");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
