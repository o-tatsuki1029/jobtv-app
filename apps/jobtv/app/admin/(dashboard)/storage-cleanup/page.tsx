"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getStorageDeletionQueue,
  getQueueStatusCounts,
  approveQueueItems,
  approveAllPending,
  executeApprovedItems,
  clearCompletedItems,
  getCleanupSchedules,
  createCleanupSchedule,
  executeImmediateScan,
} from "@/lib/actions/storage-cleanup-actions";
import { HardDrive, Trash2, CheckCircle, Clock, AlertCircle, Calendar, Zap } from "lucide-react";

type QueueItem = {
  id: string;
  storage_type: string;
  bucket: string;
  path: string;
  is_prefix: boolean;
  source: string;
  source_detail: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  executed_at: string | null;
  error_message: string | null;
};

type ScheduleRow = {
  id: string;
  scan_from: string;
  scan_to: string;
  scheduled_at: string;
  status: string;
  created_at: string;
  result: Record<string, unknown> | null;
};

type StatusCounts = {
  pending: number;
  approved: number;
  completed: number;
  failed: number;
};

export default function StorageCleanupPage() {
  const [tab, setTab] = useState<"queue" | "schedule">("queue");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<StatusCounts>({ pending: 0, approved: 0, completed: 0, failed: 0 });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [scanFrom, setScanFrom] = useState("");
  const [scanTo, setScanTo] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const loadQueue = useCallback(async () => {
    setLoading(true);
    const [queueResult, countResult] = await Promise.all([
      getStorageDeletionQueue({ status: statusFilter, page, perPage: 50 }),
      getQueueStatusCounts(),
    ]);
    setQueue(queueResult.data ?? []);
    setTotal(queueResult.total);
    if (countResult.data) setCounts(countResult.data);
    setSelectedIds(new Set());
    setLoading(false);
  }, [statusFilter, page]);

  const loadSchedules = useCallback(async () => {
    const result = await getCleanupSchedules();
    setSchedules(result.data ?? []);
  }, []);

  useEffect(() => {
    if (tab === "queue") loadQueue();
    else loadSchedules();
  }, [tab, loadQueue, loadSchedules]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleApproveSelected = async () => {
    if (selectedIds.size === 0) return;
    const result = await approveQueueItems(Array.from(selectedIds));
    if (result.error) return showMessage(`Error: ${result.error}`);
    showMessage(`${result.data} 件を承認しました`);
    loadQueue();
  };

  const handleApproveAll = async () => {
    if (!confirm("全ての pending アイテムを承認しますか？")) return;
    const result = await approveAllPending();
    if (result.error) return showMessage(`Error: ${result.error}`);
    showMessage(`${result.data} 件を一括承認しました`);
    loadQueue();
  };

  const handleExecute = async () => {
    if (!confirm("承認済みアイテムを実行（削除）しますか？")) return;
    setLoading(true);
    const result = await executeApprovedItems();
    setLoading(false);
    if (result.error) return showMessage(`Error: ${result.error}`);
    const d = result.data!;
    showMessage(`処理: ${d.processed} 件 / 成功: ${d.succeeded} 件 / 失敗: ${d.failed} 件`);
    loadQueue();
  };

  const handleClearCompleted = async () => {
    if (!confirm("完了・失敗済みの履歴を削除しますか？")) return;
    const result = await clearCompletedItems();
    if (result.error) return showMessage(`Error: ${result.error}`);
    showMessage(`${result.data} 件の履歴を削除しました`);
    loadQueue();
  };

  const handleCreateSchedule = async () => {
    if (!scanFrom || !scanTo || !scheduledAt) {
      return showMessage("全ての日時を入力してください");
    }
    const result = await createCleanupSchedule({
      scanFrom: new Date(scanFrom).toISOString(),
      scanTo: new Date(scanTo).toISOString(),
      scheduledAt: new Date(scheduledAt).toISOString(),
    });
    if (result.error) return showMessage(`Error: ${result.error}`);
    showMessage("スキャン予約を作成しました");
    setScanFrom("");
    setScanTo("");
    setScheduledAt("");
    loadSchedules();
  };

  const handleImmediateScan = async () => {
    if (!scanFrom || !scanTo) {
      return showMessage("スキャン対象期間を入力してください");
    }
    if (!confirm("即時スキャンを実行しますか？ 孤立ファイルが削除キューに登録されます。")) return;
    setLoading(true);
    const result = await executeImmediateScan({
      scanFrom: new Date(scanFrom).toISOString(),
      scanTo: new Date(scanTo).toISOString(),
    });
    setLoading(false);
    if (result.error) return showMessage(`Error: ${result.error}`);
    showMessage(`スキャン完了: ${result.data!.orphanedCount} 件の孤立ファイルをキューに登録しました`);
    setScanFrom("");
    setScanTo("");
    loadSchedules();
    loadQueue();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === queue.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queue.map((q) => q.id)));
    }
  };

  const totalPages = Math.ceil(total / 50);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      running: "bg-purple-100 text-purple-800",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <HardDrive className="h-6 w-6 text-gray-600" />
        <h1 className="text-2xl font-bold">ストレージ管理</h1>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded text-sm">{message}</div>
      )}

      {/* ステータスサマリ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {([
          { key: "pending", label: "未承認", icon: Clock, color: "text-yellow-600" },
          { key: "approved", label: "承認済み", icon: CheckCircle, color: "text-blue-600" },
          { key: "completed", label: "完了", icon: Trash2, color: "text-green-600" },
          { key: "failed", label: "失敗", icon: AlertCircle, color: "text-red-600" },
        ] as const).map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-sm text-gray-500">{label}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{counts[key]}</div>
          </div>
        ))}
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setTab("queue")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "queue" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          削除キュー
        </button>
        <button
          onClick={() => setTab("schedule")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "schedule" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          スキャン予約
        </button>
      </div>

      {tab === "queue" && (
        <div>
          {/* フィルタ + アクション */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="pending">未承認</option>
              <option value="approved">承認済み</option>
              <option value="completed">完了</option>
              <option value="failed">失敗</option>
            </select>

            {statusFilter === "pending" && (
              <>
                <button
                  onClick={handleApproveSelected}
                  disabled={selectedIds.size === 0}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  選択を承認 ({selectedIds.size})
                </button>
                <button
                  onClick={handleApproveAll}
                  disabled={counts.pending === 0}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 disabled:opacity-50"
                >
                  全て承認 ({counts.pending})
                </button>
              </>
            )}

            {statusFilter === "approved" && (
              <button
                onClick={handleExecute}
                disabled={counts.approved === 0 || loading}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? "実行中..." : `承認済みを実行 (${counts.approved})`}
              </button>
            )}

            {(statusFilter === "completed" || statusFilter === "failed") && (
              <button
                onClick={handleClearCompleted}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                履歴をクリア
              </button>
            )}
          </div>

          {/* テーブル */}
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {statusFilter === "pending" && (
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={queue.length > 0 && selectedIds.size === queue.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="px-3 py-2 text-left">ストレージ</th>
                  <th className="px-3 py-2 text-left">パス</th>
                  <th className="px-3 py-2 text-left">プレフィックス</th>
                  <th className="px-3 py-2 text-left">発生源</th>
                  <th className="px-3 py-2 text-left">ステータス</th>
                  <th className="px-3 py-2 text-left">登録日時</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    {statusFilter === "pending" && (
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                    )}
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        item.storage_type === "s3" ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {item.storage_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs max-w-xs truncate" title={item.path}>
                      {item.path}
                    </td>
                    <td className="px-3 py-2">{item.is_prefix ? "Yes" : "No"}</td>
                    <td className="px-3 py-2 text-xs">
                      <div>{item.source}</div>
                      {item.source_detail && (
                        <div className="text-gray-400">{item.source_detail}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {statusBadge(item.status)}
                      {item.error_message && (
                        <div className="text-xs text-red-500 mt-1" title={item.error_message}>
                          {item.error_message.substring(0, 50)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDate(item.created_at)}</td>
                  </tr>
                ))}
                {queue.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                      該当するアイテムはありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">全 {total} 件</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  前へ
                </button>
                <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div>
          {/* 新規予約フォーム */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              フルスキャン予約
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              指定期間内のストレージファイルを DB 参照と突合し、孤立ファイルを削除キューに登録します。
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">スキャン対象期間（開始）</label>
                <input
                  type="datetime-local"
                  value={scanFrom}
                  onChange={(e) => setScanFrom(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">スキャン対象期間（終了）</label>
                <input
                  type="datetime-local"
                  value={scanTo}
                  onChange={(e) => setScanTo(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">実行予定日時</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCreateSchedule}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                予約を作成
              </button>
              <button
                onClick={handleImmediateScan}
                disabled={loading || !scanFrom || !scanTo}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Zap className="h-4 w-4" />
                {loading ? "スキャン中..." : "即時スキャン実行"}
              </button>
            </div>
          </div>

          {/* 予約一覧 */}
          <div className="bg-white rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">スキャン期間</th>
                  <th className="px-3 py-2 text-left">実行予定日時</th>
                  <th className="px-3 py-2 text-left">ステータス</th>
                  <th className="px-3 py-2 text-left">結果</th>
                  <th className="px-3 py-2 text-left">作成日時</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs">
                      {formatDate(s.scan_from)} 〜 {formatDate(s.scan_to)}
                    </td>
                    <td className="px-3 py-2 text-xs">{formatDate(s.scheduled_at)}</td>
                    <td className="px-3 py-2">{statusBadge(s.status)}</td>
                    <td className="px-3 py-2 text-xs">
                      {s.result ? (
                        <span>
                          孤立: {(s.result as Record<string, number>).orphanedCount ?? "-"} 件
                          (S3: {(s.result as Record<string, number>).s3Count ?? 0},
                          Supabase: {(s.result as Record<string, number>).supabaseCount ?? 0})
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDate(s.created_at)}</td>
                  </tr>
                ))}
                {schedules.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-400">
                      予約はありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
