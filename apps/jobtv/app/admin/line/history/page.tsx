"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import {
  getLineBroadcastLogs,
  getLineBroadcastLogStats,
  cancelScheduledBroadcast,
} from "@/lib/actions/line-broadcast-log-actions";
import type { LineBroadcastLog, LineBroadcastLogStats, LineBroadcastLogStatus } from "@/types/line-broadcast.types";

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<
  LineBroadcastLogStatus,
  { variant: "success" | "warning" | "info" | "error" | "neutral"; label: string }
> = {
  sent: { variant: "success", label: "送信済み" },
  scheduled: { variant: "warning", label: "予約中" },
  sending: { variant: "info", label: "送信中" },
  failed: { variant: "error", label: "失敗" },
  cancelled: { variant: "neutral", label: "キャンセル" },
  draft: { variant: "neutral", label: "下書き" },
};

export default function AdminLineBroadcastHistoryPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LineBroadcastLog[]>([]);
  const [stats, setStats] = useState<LineBroadcastLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | LineBroadcastLogStatus>("");
  const [page, setPage] = useState(0);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [logsResult, statsResult] = await Promise.all([
      getLineBroadcastLogs({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: statusFilter || undefined,
      }),
      page === 0 ? getLineBroadcastLogStats() : Promise.resolve({ data: stats, error: null }),
    ]);

    if (logsResult.error) {
      setError(logsResult.error);
    } else {
      setLogs((logsResult.data ?? []) as LineBroadcastLog[]);
    }
    if (statsResult.data) {
      setStats(statsResult.data);
    }
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = () => {
    setPage(0);
  };

  const handleCancel = async (logId: string) => {
    if (!confirm("この予約配信をキャンセルしますか？")) return;
    setCancelling(logId);
    const result = await cancelScheduledBroadcast(logId);
    if (result.error) {
      alert(result.error);
    } else {
      await fetchLogs();
    }
    setCancelling(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <ClipboardList className="w-8 h-8" />
            LINE配信履歴
          </h1>
          <p className="text-gray-500 font-medium">LINE配信の履歴と結果を確認します</p>
        </div>
        <StudioButton
          variant="outline"
          onClick={fetchLogs}
          icon={<RefreshCw className="w-4 h-4" />}
        >
          更新
        </StudioButton>
      </div>

      {/* 統計サマリー */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">{stats.totalBroadcasts.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">総配信数</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalSent.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">成功</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalFailed.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">失敗</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.totalBlocked.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">ブロック</div>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | LineBroadcastLogStatus);
            handleFilterChange();
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        >
          <option value="">すべて</option>
          <option value="sent">送信済み</option>
          <option value="scheduled">予約中</option>
          <option value="sending">送信中</option>
          <option value="failed">失敗</option>
          <option value="cancelled">キャンセル</option>
        </select>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {!loading && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                    <th className="px-6 py-4 whitespace-nowrap">日時</th>
                    <th className="px-6 py-4 whitespace-nowrap">ステータス</th>
                    <th className="px-6 py-4 whitespace-nowrap">対象数</th>
                    <th className="px-6 py-4 whitespace-nowrap">成功</th>
                    <th className="px-6 py-4 whitespace-nowrap">失敗</th>
                    <th className="px-6 py-4 whitespace-nowrap">ブロック</th>
                    <th className="px-6 py-4 whitespace-nowrap">予約日時</th>
                    <th className="px-6 py-4 whitespace-nowrap">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>配信履歴がありません</p>
                        <p className="text-xs mt-1">まだLINE配信が行われていません</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const status = log.status as LineBroadcastLogStatus;
                      const badge = STATUS_BADGE[status] ?? { variant: "neutral" as const, label: status };
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/admin/line/history/${log.id}`)}
                        >
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
                            {formatDate(log.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <StudioBadge variant={badge.variant}>
                              {badge.label}
                            </StudioBadge>
                          </td>
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {log.target_count?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-green-600 whitespace-nowrap">
                            {log.sent_count?.toLocaleString() ?? 0}
                          </td>
                          <td className="px-6 py-4 text-red-600 whitespace-nowrap">
                            {log.failed_count?.toLocaleString() ?? 0}
                          </td>
                          <td className="px-6 py-4 text-yellow-600 whitespace-nowrap">
                            {log.blocked_count?.toLocaleString() ?? 0}
                          </td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
                            {formatDate(log.scheduled_at)}
                          </td>
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            {status === "scheduled" && (
                              <StudioButton
                                variant="danger"
                                size="sm"
                                disabled={cancelling === log.id}
                                onClick={() => handleCancel(log.id)}
                              >
                                {cancelling === log.id ? "処理中…" : "キャンセル"}
                              </StudioButton>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ページネーション */}
          {logs.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{page * PAGE_SIZE + 1}〜{page * PAGE_SIZE + logs.length} 件</span>
              <div className="flex gap-2">
                <StudioButton
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  前へ
                </StudioButton>
                <StudioButton
                  variant="outline"
                  size="sm"
                  disabled={logs.length < PAGE_SIZE}
                  onClick={() => setPage((p) => p + 1)}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  次へ
                </StudioButton>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
