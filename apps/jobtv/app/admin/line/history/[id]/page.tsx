"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, RefreshCw, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import {
  getLineBroadcastLogDetail,
  getLineBroadcastDeliveries,
  exportLineBroadcastDeliveries,
  retryFailedDeliveries,
} from "@/lib/actions/line-broadcast-log-actions";
import type {
  LineBroadcastLog,
  LineBroadcastDeliveryWithCandidate,
  LineBroadcastLogStatus,
  LineBroadcastDeliveryStatus,
} from "@/types/line-broadcast.types";

const PAGE_SIZE = 50;

const LOG_STATUS_BADGE: Record<
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

export default function AdminLineBroadcastDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [log, setLog] = useState<LineBroadcastLog | null>(null);
  const [deliveries, setDeliveries] = useState<LineBroadcastDeliveryWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<"" | LineBroadcastDeliveryStatus>("");
  const [page, setPage] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [logResult, deliveriesResult] = await Promise.all([
      getLineBroadcastLogDetail(id),
      getLineBroadcastDeliveries(id, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: deliveryStatusFilter || undefined,
      }),
    ]);

    if (logResult.error) {
      setError(logResult.error);
    } else {
      setLog(logResult.data);
    }
    if (deliveriesResult.error) {
      setError(deliveriesResult.error);
    } else {
      setDeliveries((deliveriesResult.data ?? []) as LineBroadcastDeliveryWithCandidate[]);
    }
    setLoading(false);
  }, [id, page, deliveryStatusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = () => {
    setPage(0);
  };

  const handleRetry = async () => {
    if (!confirm("失敗した配信をリトライしますか？")) return;
    setRetrying(true);
    const result = await retryFailedDeliveries(id);
    if (result.error) {
      alert(result.error);
    } else if (result.data) {
      alert(`リトライ完了: ${result.data.retried}件中 成功${result.data.success}件 / 失敗${result.data.failed}件`);
      await fetchData();
    }
    setRetrying(false);
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportLineBroadcastDeliveries(id);
    if (result.error) {
      alert(result.error);
    } else if (result.data) {
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `line-broadcast-${id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
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

  const logStatus = (log?.status ?? "draft") as LineBroadcastLogStatus;
  const logBadge = LOG_STATUS_BADGE[logStatus] ?? { variant: "neutral" as const, label: logStatus };

  const hasRetryableDeliveries =
    log && (log.failed_count ?? 0) > 0;

  const totalDelivered = (log?.sent_count ?? 0) + (log?.failed_count ?? 0) + (log?.blocked_count ?? 0);
  const successRate = totalDelivered > 0 ? Math.round(((log?.sent_count ?? 0) / totalDelivered) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/line/history")}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <ClipboardList className="w-8 h-8" />
              配信詳細
            </h1>
            <p className="text-gray-500 font-medium">配信結果の詳細を確認します</p>
          </div>
        </div>
        <div className="flex gap-2">
          <StudioButton
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
            icon={<Download className="w-4 h-4" />}
          >
            {exporting ? "エクスポート中…" : "CSV"}
          </StudioButton>
          <StudioButton
            variant="outline"
            onClick={fetchData}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            更新
          </StudioButton>
        </div>
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {!loading && log && (
        <>
          {/* 配信メタデータ */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">ステータス</div>
                <StudioBadge variant={logBadge.variant}>{logBadge.label}</StudioBadge>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">対象数</div>
                <div className="font-bold text-gray-800">{log.target_count?.toLocaleString() ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">成功 / 失敗 / ブロック</div>
                <div className="font-bold">
                  <span className="text-green-600">{log.sent_count ?? 0}</span>
                  {" / "}
                  <span className="text-red-600">{log.failed_count ?? 0}</span>
                  {" / "}
                  <span className="text-yellow-600">{log.blocked_count ?? 0}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">作成日時</div>
                <div className="font-bold text-gray-800 text-xs">{formatDate(log.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">送信完了日時</div>
                <div className="font-bold text-gray-800 text-xs">{formatDate(log.sent_at)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">予約日時</div>
                <div className="font-bold text-gray-800 text-xs">{formatDate(log.scheduled_at)}</div>
              </div>
            </div>
          </div>

          {/* 統計カード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{(log.sent_count ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">成功</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{(log.failed_count ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">失敗</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{(log.blocked_count ?? 0).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">ブロック</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{successRate}%</div>
              <div className="text-xs text-gray-500 mt-1">成功率</div>
            </div>
          </div>

          {/* アクションボタン */}
          {hasRetryableDeliveries && (
            <div className="flex gap-2">
              <StudioButton
                variant="danger"
                onClick={handleRetry}
                disabled={retrying}
                icon={<RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />}
              >
                {retrying ? "リトライ中…" : "失敗分をリトライ"}
              </StudioButton>
            </div>
          )}

          {/* フィルター */}
          <div className="flex flex-wrap gap-3">
            <select
              value={deliveryStatusFilter}
              onChange={(e) => {
                setDeliveryStatusFilter(e.target.value as "" | LineBroadcastDeliveryStatus);
                handleFilterChange();
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
            >
              <option value="">すべてのステータス</option>
              <option value="success">成功</option>
              <option value="failed">失敗</option>
              <option value="blocked">ブロック</option>
              <option value="pending">送信待ち</option>
            </select>
          </div>

          {/* 配信結果テーブル */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                    <th className="px-6 py-4 whitespace-nowrap">氏名</th>
                    <th className="px-6 py-4 whitespace-nowrap">学校</th>
                    <th className="px-6 py-4 whitespace-nowrap">卒年</th>
                    <th className="px-6 py-4 whitespace-nowrap">LINE ID</th>
                    <th className="px-6 py-4 whitespace-nowrap">ステータス</th>
                    <th className="px-6 py-4">エラー</th>
                    <th className="px-6 py-4 whitespace-nowrap">日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>配信結果がありません</p>
                        <p className="text-xs mt-1">まだ配信結果が記録されていません</p>
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((delivery) => {
                      const status = delivery.status as LineBroadcastDeliveryStatus;
                      return (
                        <tr key={delivery.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {delivery.candidate_name}
                          </td>
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {delivery.school_name ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                            {delivery.graduation_year ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                              {delivery.line_user_id}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StudioBadge
                              variant={
                                status === "success"
                                  ? "success"
                                  : status === "failed"
                                    ? "error"
                                    : status === "blocked"
                                      ? "warning"
                                      : "neutral"
                              }
                            >
                              {status === "success"
                                ? "成功"
                                : status === "failed"
                                  ? "失敗"
                                  : status === "blocked"
                                    ? "ブロック"
                                    : "送信待ち"}
                            </StudioBadge>
                          </td>
                          <td className="px-6 py-4 text-red-600 text-xs max-w-xs truncate">
                            {delivery.error_message ?? ""}
                          </td>
                          <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
                            {formatDate(delivery.last_attempted_at)}
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
          {deliveries.length > 0 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{page * PAGE_SIZE + 1}〜{page * PAGE_SIZE + deliveries.length} 件</span>
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
                  disabled={deliveries.length < PAGE_SIZE}
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
