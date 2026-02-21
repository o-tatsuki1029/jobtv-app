"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, MoreVertical, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioSearchInput from "@/components/studio/molecules/StudioSearchInput";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import { getAllReservations } from "@/lib/actions/session-reservation-actions";

interface ReservationData {
  id: string;
  status: string;
  attended: boolean;
  created_at: string;
  candidates: {
    last_name: string;
    first_name: string;
    profiles?: { email: string | null } | null;
    school_name: string | null;
    graduation_year: number | null;
  } | null;
  session_date: {
    event_date: string;
    start_time: string;
    end_time: string;
  } | null;
  session: {
    id: string;
    title: string;
  } | null;
}

function CandidatesContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [filterSessionId, setFilterSessionId] = useState<string | null>(null);
  const [allReservations, setAllReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (sessionId) {
      setFilterSessionId(sessionId);
    }
  }, [sessionId]);

  useEffect(() => {
    const loadReservations = async () => {
      setLoading(true);
      setError(null);
      setCurrentPage(1); // フィルター変更時はページをリセット
      const { data, error: fetchError } = await getAllReservations(100, filterSessionId);
      if (fetchError) {
        setError(fetchError);
      } else {
        setAllReservations(data || []);
      }
      setLoading(false);
    };

    loadReservations();
  }, [filterSessionId]);

  // ページネーション計算
  const totalPages = Math.ceil(allReservations.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentReservations = allReservations.slice(startIndex, endIndex);

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1); // ページサイズ変更時はページをリセット
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(
      2,
      "0"
    )}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reserved":
        return { variant: "success" as const, text: "予約済み" };
      case "cancelled":
        return { variant: "error" as const, text: "キャンセル" };
      case "completed":
        return { variant: "neutral" as const, text: "完了" };
      default:
        return { variant: "neutral" as const, text: status };
    }
  };

  return (
    <div className="space-y-10">
      <ErrorMessage message={error || ""} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">候補者管理</h1>
          <p className="text-gray-500 font-medium">
            {filterSessionId
              ? "選択された説明会の予約者一覧を表示しています。"
              : "全ての説明会の予約者一覧を表示しています。"}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <StudioSearchInput placeholder="名前やメールアドレスで検索..." containerClassName="flex-1" />
        <div className="flex gap-2">
          {filterSessionId && (
            <StudioButton
              variant="outline"
              onClick={() => {
                setFilterSessionId(null);
                window.history.pushState({}, "", "/studio/candidates");
              }}
            >
              フィルターをクリア
            </StudioButton>
          )}
          <StudioButton variant="outline" icon={<Filter className="w-4 h-4" />}>
            フィルター
          </StudioButton>
          <StudioButton>CSVエクスポート</StudioButton>
        </div>
      </div>

      {/* 表示件数選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">表示件数:</span>
          <StudioSelect value={pageSize.toString()} onChange={handlePageSizeChange} className="w-24">
            <option value="10">10件</option>
            <option value="50">50件</option>
            <option value="100">100件</option>
          </StudioSelect>
        </div>
        {!loading && allReservations.length > 0 && (
          <p className="text-sm text-gray-500">
            全{allReservations.length}件中 {startIndex + 1}〜{Math.min(endIndex, allReservations.length)}件を表示
          </p>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="px-6 py-4">氏名</th>
                  <th className="px-6 py-4">説明会</th>
                  <th className="px-6 py-4">日程</th>
                  <th className="px-6 py-4">ステータス</th>
                  <th className="px-6 py-4">予約日</th>
                  <th className="px-6 py-4 text-center">連絡</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {allReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      予約がありません
                    </td>
                  </tr>
                ) : (
                  currentReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                            {reservation.candidates?.last_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">
                              {reservation.candidates
                                ? `${reservation.candidates.last_name} ${reservation.candidates.first_name}`
                                : "不明"}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{reservation.candidates?.profiles?.email ?? "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-600">{reservation.session?.title || "-"}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {reservation.session_date
                          ? `${formatDate(reservation.session_date.event_date)} ${reservation.session_date.start_time}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <StudioBadge variant={getStatusBadge(reservation.status).variant}>
                          {getStatusBadge(reservation.status).text}
                        </StudioBadge>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-medium">{formatDate(reservation.created_at)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-black transition-colors">
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {allReservations.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                ページ {currentPage} / {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <StudioButton
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  icon={<ChevronLeft className="w-4 h-4" />}
                >
                  前へ
                </StudioButton>
                <StudioButton
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  icon={<ChevronRight className="w-4 h-4" />}
                >
                  次へ
                </StudioButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <CandidatesContent />
    </Suspense>
  );
}
