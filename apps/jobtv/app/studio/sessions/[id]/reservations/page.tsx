"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Users, Calendar, CheckCircle, XCircle, Clock } from "lucide-react";
import StudioBackButton from "@/components/studio/atoms/StudioBackButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioButton from "@/components/studio/atoms/StudioButton";
import {
  getSessionReservations,
  markReservationAttended,
  cancelReservation,
  type ReservationWithCandidate
} from "@/lib/actions/session-reservation-actions";
import { getSessionDates } from "@/lib/actions/session-actions";

interface SessionDate {
  id: string;
  event_date: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
}

interface ReservationWithDate extends ReservationWithCandidate {
  session_date?: SessionDate;
}

export default function SessionReservationsPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [reservations, setReservations] = useState<ReservationWithDate[]>([]);
  const [sessionDates, setSessionDates] = useState<SessionDate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateId, setSelectedDateId] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);

    try {
      // 日程一覧を取得
      const datesResult = await getSessionDates(sessionId);
      if (datesResult.error) {
        setError(datesResult.error);
        return;
      }
      setSessionDates(datesResult.data || []);

      // 予約一覧を取得
      const reservationsResult = await getSessionReservations(sessionId);
      if (reservationsResult.error) {
        setError(reservationsResult.error);
        return;
      }
      setReservations(reservationsResult.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleAttended(reservationId: string, currentAttended: boolean) {
    const result = await markReservationAttended(reservationId, !currentAttended);
    if (result.error) {
      alert(result.error);
      return;
    }
    fetchData();
  }

  async function handleCancelReservation(reservationId: string) {
    if (!confirm("この予約をキャンセルしますか？")) return;

    const result = await cancelReservation(reservationId);
    if (result.error) {
      alert(result.error);
      return;
    }
    fetchData();
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return `${month}月${day}日(${dayOfWeek})`;
  }

  function formatTime(timeStr: string): string {
    return timeStr.slice(0, 5);
  }

  // フィルタリング
  const filteredReservations =
    selectedDateId === "all"
      ? reservations
      : reservations.filter((r) => r.session_date_id === selectedDateId);

  // 日程ごとの予約数を計算
  const reservationCountsByDate: Record<string, number> = {};
  reservations.forEach((r) => {
    if (r.session_date_id && r.status === "reserved") {
      reservationCountsByDate[r.session_date_id] = (reservationCountsByDate[r.session_date_id] || 0) + 1;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <StudioBackButton href={`/studio/sessions/${sessionId}`} />
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">予約者管理</h1>
          <p className="text-gray-500 font-medium">説明会・インターンシップの予約者を管理します</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
        </div>
      )}

      {/* 日程フィルター */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg text-gray-900">日程で絞り込み</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDateId("all")}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              selectedDateId === "all"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            すべて ({reservations.filter((r) => r.status === "reserved").length}件)
          </button>
          {sessionDates.map((date) => (
            <button
              key={date.id}
              onClick={() => setSelectedDateId(date.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedDateId === date.id
                  ? "bg-black text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {formatDate(date.event_date)} {formatTime(date.start_time)}〜
              {date.capacity && ` (${reservationCountsByDate[date.id] || 0}/${date.capacity})`}
            </button>
          ))}
        </div>
      </div>

      {/* 予約者リスト */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-lg text-gray-900">
              予約者一覧 ({filteredReservations.filter((r) => r.status === "reserved").length}件)
            </h2>
          </div>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">予約者がいません</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    日程
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    氏名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    フリガナ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    メールアドレス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    電話番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    学校名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    出席
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReservations.map((reservation) => {
                  const date = sessionDates.find((d) => d.id === reservation.session_date_id);
                  return (
                    <tr key={reservation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {date && (
                          <div>
                            <div className="font-medium">{formatDate(date.event_date)}</div>
                            <div className="text-xs text-gray-500">
                              {formatTime(date.start_time)}〜{formatTime(date.end_time)}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reservation.candidates?.last_name} {reservation.candidates?.first_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.candidates?.last_name_kana} {reservation.candidates?.first_name_kana}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.candidates?.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.candidates?.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reservation.candidates?.school_name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reservation.status === "reserved" ? (
                          <StudioBadge variant="success">予約済み</StudioBadge>
                        ) : reservation.status === "cancelled" ? (
                          <StudioBadge variant="neutral">キャンセル</StudioBadge>
                        ) : (
                          <StudioBadge variant="neutral">{reservation.status}</StudioBadge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAttended(reservation.id, reservation.attended)}
                          className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                            reservation.attended
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                          disabled={reservation.status !== "reserved"}
                        >
                          {reservation.attended ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              出席済み
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" />
                              未出席
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {reservation.status === "reserved" && (
                          <StudioButton
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelReservation(reservation.id)}
                          >
                            キャンセル
                          </StudioButton>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

