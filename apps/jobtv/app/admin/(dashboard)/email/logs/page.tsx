"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import { getEmailLogs, getEmailLogStats } from "@/lib/actions/email-log-actions";

const PAGE_SIZE = 50;

interface EmailLog {
  id: string;
  template_name: string;
  recipient_email: string;
  subject: string;
  status: "sent" | "failed";
  sendgrid_message_id: string | null;
  error_message: string | null;
  slack_notified: boolean;
  created_at: string;
}

interface LogStats {
  totalSent: number;
  totalFailed: number;
  byTemplate: Record<string, { sent: number; failed: number }>;
}

export default function AdminEmailLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"" | "sent" | "failed">("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [logsResult, statsResult] = await Promise.all([
      getEmailLogs({
        limit:        PAGE_SIZE,
        offset:       page * PAGE_SIZE,
        status:       statusFilter || undefined,
        templateName: templateFilter || undefined,
      }),
      page === 0 ? getEmailLogStats() : Promise.resolve({ data: stats, error: null }),
    ]);

    if (logsResult.error) {
      setError(logsResult.error);
    } else {
      setLogs((logsResult.data ?? []) as EmailLog[]);
    }
    if (statsResult.data) {
      setStats(statsResult.data);
    }
    setLoading(false);
  }, [page, statusFilter, templateFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = () => {
    setPage(0);
  };

  const templateNames = stats ? Object.keys(stats.byTemplate) : [];

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/email/templates")}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <Mail className="w-8 h-8" />
              メール送付ログ
            </h1>
            <p className="text-gray-500 font-medium">送付されたメールの履歴を確認します</p>
          </div>
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
            <div className="text-2xl font-bold text-green-600">{stats.totalSent.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">送信成功</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.totalFailed.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">送信失敗</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {(stats.totalSent + stats.totalFailed).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">合計</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-800">
              {stats.totalSent + stats.totalFailed > 0
                ? Math.round((stats.totalSent / (stats.totalSent + stats.totalFailed)) * 100)
                : 0}
              %
            </div>
            <div className="text-xs text-gray-500 mt-1">成功率</div>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "" | "sent" | "failed");
            handleFilterChange();
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        >
          <option value="">すべてのステータス</option>
          <option value="sent">送信成功</option>
          <option value="failed">送信失敗</option>
        </select>
        <select
          value={templateFilter}
          onChange={(e) => {
            setTemplateFilter(e.target.value);
            handleFilterChange();
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        >
          <option value="">すべてのテンプレート</option>
          {templateNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
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
                    <th className="px-6 py-4 whitespace-nowrap">テンプレート</th>
                    <th className="px-6 py-4 whitespace-nowrap">宛先</th>
                    <th className="px-6 py-4">件名</th>
                    <th className="px-6 py-4 whitespace-nowrap">ステータス</th>
                    <th className="px-6 py-4 whitespace-nowrap">Message ID</th>
                    <th className="px-6 py-4">エラー</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p>ログがありません</p>
                        <p className="text-xs mt-1">まだメールが送付されていません</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap text-xs">
                          {new Date(log.created_at).toLocaleString("ja-JP", {
                            timeZone: "Asia/Tokyo",
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                            {log.template_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
                          {log.recipient_email}
                        </td>
                        <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="px-6 py-4">
                          <StudioBadge
                            variant={log.status === "sent" ? "success" : "error"}
                          >
                            {log.status === "sent" ? "送信済み" : "失敗"}
                          </StudioBadge>
                        </td>
                        <td className="px-6 py-4">
                          {log.sendgrid_message_id ? (
                            <span className="font-mono text-xs text-gray-500">
                              {log.sendgrid_message_id.slice(0, 16)}…
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-red-600 text-xs max-w-xs truncate">
                          {log.error_message ?? ""}
                        </td>
                      </tr>
                    ))
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
