"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, X, Pencil } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import PaginationBar from "@/components/studio/molecules/PaginationBar";
import {
  getEvents,
  getEventTypes,
  getEventAreas,
  getEventGraduationYears,
  createEvent,
} from "@/lib/actions/event-admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

type EventType = Tables<"event_types">;
type EventArea = Tables<"event_areas">;
type EventGraduationYear = Tables<"event_graduation_years">;
type EventWithType = Tables<"events"> & { event_types: EventType | null };

const PAGE_SIZE_OPTIONS = [10, 50, 100] as const;
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export default function EventsListTab() {
  const router = useRouter();
  const [events, setEvents] = useState<EventWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // フィルタ
  const [filterArea, setFilterArea] = useState("");
  const [filterGradYear, setFilterGradYear] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc">("date_desc");

  // マスタデータ
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [areas, setAreas] = useState<EventArea[]>([]);
  const [graduationYears, setGraduationYears] = useState<EventGraduationYear[]>([]);

  // モーダル
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    event_type_id: "",
    event_date: "",
    start_time: "",
    end_time: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  // マスタデータの読み込み
  useEffect(() => {
    const loadMasters = async () => {
      const [typesRes, areasRes, yearsRes] = await Promise.all([
        getEventTypes(),
        getEventAreas(),
        getEventGraduationYears(),
      ]);
      if (typesRes.data) setEventTypes(typesRes.data);
      if (areasRes.data) setAreas(areasRes.data);
      if (yearsRes.data) setGraduationYears(yearsRes.data);
    };
    loadMasters();
  }, []);

  const loadEvents = useCallback(async (currentPage = page) => {
    setLoading(true);
    setError(null);
    const { data, count, error: fetchError } = await getEvents({
      limit: pageSize,
      offset: currentPage * pageSize,
      area: filterArea || undefined,
      graduationYear: filterGradYear ? Number(filterGradYear) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
    });
    if (fetchError) {
      setError(fetchError);
    } else {
      setEvents(data || []);
      setTotalCount(count);
    }
    setLoading(false);
  }, [page, pageSize, filterArea, filterGradYear, dateFrom, dateTo, sortBy]);

  useEffect(() => {
    setPage(0);
  }, [filterArea, filterGradYear, dateFrom, dateTo, sortBy, pageSize]);

  useEffect(() => {
    loadEvents(page);
  }, [page, loadEvents]);

  const handleOpenCreateModal = () => {
    setCreateForm({ event_type_id: "", event_date: "", start_time: "", end_time: "" });
    setFormError(null);
    setIsSubmitting(false);
    setIsCreateModalOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!createForm.event_type_id || !createForm.event_date || !createForm.start_time || !createForm.end_time) {
      setFormError("すべての項目を入力してください");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const { data, error: createError } = await createEvent(createForm);

    if (createError) {
      setFormError(createError);
      setIsSubmitting(false);
      return;
    }

    if (data) {
      setSuccessMessage("イベントを作成しました");
      setIsCreateModalOpen(false);
      setPage(0);
      loadEvents(0);
    }
    setIsSubmitting(false);
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
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* ヘッダー */}
      <div className="flex justify-end">
        <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
          新規イベントを作成
        </StudioButton>
      </div>

      {/* フィルタ */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end flex-wrap">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600">エリア</label>
          <StudioSelect value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
            <option value="">すべて</option>
            {areas.map((a) => (
              <option key={a.id} value={a.name}>{a.name}</option>
            ))}
          </StudioSelect>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600">卒業年度</label>
          <StudioSelect value={filterGradYear} onChange={(e) => setFilterGradYear(e.target.value)}>
            <option value="">すべて</option>
            {graduationYears.map((y) => (
              <option key={y.id} value={y.year.toString()}>{y.year}年卒</option>
            ))}
          </StudioSelect>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600">開催日（から）</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600">開催日（まで）</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600">並び順</label>
          <StudioSelect value={sortBy} onChange={(e) => setSortBy(e.target.value as "date_asc" | "date_desc")}>
            <option value="date_desc">開催日（新しい順）</option>
            <option value="date_asc">開催日（古い順）</option>
          </StudioSelect>
        </div>
      </div>

      {/* ページネーション（上） */}
      {(events.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemCount={events.length}
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
                <th className="px-6 py-4">開催日</th>
                <th className="px-6 py-4">イベント名</th>
                <th className="px-6 py-4">エリア</th>
                <th className="px-6 py-4">対象卒年度</th>
                <th className="px-6 py-4">時間</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>イベントがありません</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{event.event_date}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900">{event.event_types?.name || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{event.event_types?.area || "-"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">
                        {event.event_types?.target_graduation_year ? `${event.event_types.target_graduation_year}年卒` : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{event.start_time} 〜 {event.end_time}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StudioButton
                          variant="outline"
                          size="sm"
                          icon={<Pencil className="w-4 h-4" />}
                          onClick={() => router.push(`/admin/events/${event.id}`)}
                        >
                          編集
                        </StudioButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション（下） */}
      {(events.length > 0 || page > 0 || totalCount !== null) && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          itemCount={events.length}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onPageSizeChange={(n) => setPageSize(n as PageSizeOption)}
          unit="件"
        />
      )}

      {/* 新規作成モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">新規イベントを作成</h2>
              <p className="text-sm text-gray-600">イベントの基本情報を入力してください。</p>
            </div>

            <div className="p-8 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{formError}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  イベントタイプ <span className="text-red-500">*</span>
                </label>
                <StudioSelect
                  value={createForm.event_type_id}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, event_type_id: e.target.value }))}
                  disabled={isSubmitting}
                >
                  <option value="">選択してください</option>
                  {eventTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.area ? ` (${t.area})` : ""}{t.target_graduation_year ? ` ${t.target_graduation_year}年卒` : ""}
                    </option>
                  ))}
                </StudioSelect>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  開催日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={createForm.event_date}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, event_date: e.target.value }))}
                  disabled={isSubmitting}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    開始時刻 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={createForm.start_time}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, start_time: e.target.value }))}
                    disabled={isSubmitting}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    終了時刻 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={createForm.end_time}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, end_time: e.target.value }))}
                    disabled={isSubmitting}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleCreateEvent} disabled={isSubmitting}>
                {isSubmitting ? "作成中..." : "作成"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
