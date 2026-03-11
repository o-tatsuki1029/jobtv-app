"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users } from "lucide-react";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import PaginationBar from "@/components/studio/molecules/PaginationBar";
import {
  getEventReservations,
  updateReservationAttendance,
  type ReservationWithProfile,
} from "@/lib/actions/event-admin-actions";

interface EventReservationsTabProps {
  eventId: string;
}

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export default function EventReservationsTab({ eventId }: EventReservationsTabProps) {
  const [reservations, setReservations] = useState<ReservationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReservations = useCallback(async (currentPage = page) => {
    setLoading(true);
    setError(null);
    const res = await getEventReservations(eventId, {
      limit: pageSize,
      offset: currentPage * pageSize,
    });
    if (res.error) {
      setError(res.error);
    } else {
      setReservations(res.data || []);
      setTotalCount(res.count);
    }
    setLoading(false);
  }, [eventId, page, pageSize]);

  useEffect(() => {
    setPage(0);
  }, [pageSize]);

  useEffect(() => {
    loadReservations(page);
  }, [page, loadReservations]);

  const handleAttendanceChange = async (id: string, attended: boolean) => {
    setUpdatingId(id);
    const { error: updateError } = await updateReservationAttendance(id, attended);
    if (updateError) {
      setError(updateError);
    } else {
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, attended } : r))
      );
    }
    setUpdatingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <StudioBadge variant="success">確定</StudioBadge>;
      case "cancelled":
        return <StudioBadge variant="neutral">キャンセル</StudioBadge>;
      case "pending":
        return <StudioBadge variant="neutral">保留</StudioBadge>;
      default:
        return <StudioBadge variant="neutral">{status}</StudioBadge>;
    }
  };

  const isInitialLoading = loading && totalCount === null;

  if (isInitialLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* ページネーション（上） */}
      {(reservations.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemCount={reservations.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(n) => setPageSize(n as PageSizeOption)}
          unit="件"
        />
      )}

      {/* テーブル */}
      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4">学生名</th>
                <th className="px-6 py-4">メール</th>
                <th className="px-6 py-4">ステータス</th>
                <th className="px-6 py-4">出欠</th>
                <th className="px-6 py-4">座席番号</th>
                <th className="px-6 py-4">予約日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>予約がありません</p>
                  </td>
                </tr>
              ) : (
                reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">
                        {r.profile
                          ? `${r.profile.last_name || ""} ${r.profile.first_name || ""}`.trim() || "-"
                          : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{r.profile?.email || "-"}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                    <td className="px-6 py-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r.attended}
                          onChange={(e) => handleAttendanceChange(r.id, e.target.checked)}
                          disabled={updatingId === r.id}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">{r.attended ? "出席" : "未出席"}</span>
                      </label>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{r.seat_number || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">
                        {r.created_at ? new Date(r.created_at).toLocaleString("ja-JP") : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション（下） */}
      {(reservations.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemCount={reservations.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(n) => setPageSize(n as PageSizeOption)}
          unit="件"
        />
      )}
    </div>
  );
}
