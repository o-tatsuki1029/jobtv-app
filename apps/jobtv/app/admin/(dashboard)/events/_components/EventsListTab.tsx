"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Plus, X, Pencil, FileUp } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import PaginationBar from "@/components/studio/molecules/PaginationBar";
import { downloadCSV } from "@/lib/utils/csv";
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
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc">("date_asc");

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
    gathering_time: "",
    display_name: "",
    target_attendance: "",
    venue_address: "",
    google_maps_url: "",
    form_label: "",
    form_area: "",
    status: "active",
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
      status: filterStatus || undefined,
    });
    if (fetchError) {
      setError(fetchError);
    } else {
      setEvents(data || []);
      setTotalCount(count);
    }
    setLoading(false);
  }, [page, pageSize, filterArea, filterGradYear, dateFrom, dateTo, sortBy, filterStatus]);

  useEffect(() => {
    setPage(0);
  }, [filterArea, filterGradYear, dateFrom, dateTo, sortBy, filterStatus, pageSize]);

  useEffect(() => {
    loadEvents(page);
  }, [page, loadEvents]);

  const handleOpenCreateModal = () => {
    setCreateForm({ event_type_id: "", event_date: "", start_time: "", end_time: "", gathering_time: "", display_name: "", target_attendance: "", venue_address: "", google_maps_url: "", form_label: "", form_area: "", status: "active" });
    setFormError(null);
    setIsSubmitting(false);
    setIsCreateModalOpen(true);
  };

  // CSV インポートモーダル
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvSubmitting, setCsvSubmitting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const [csvFatalError, setCsvFatalError] = useState<string | null>(null);

  const CSV_HEADERS = [
    "イベントタイプ名", "開催日", "集合時間", "開始時刻", "終了時刻",
    "ステータス", "フロント表示名", "集客目標数",
    "会場住所", "GoogleマップURL", "フォームラベル", "フォームエリア",
  ];

  const handleOpenCsvModal = () => {
    setCsvFile(null);
    setCsvResult(null);
    setCsvFatalError(null);
    setCsvSubmitting(false);
    setIsCsvModalOpen(true);
  };

  const handleDownloadCsvTemplate = () => {
    const sample = [
      "合同説明会 東京", "2026-04-01", "12:30", "13:00", "17:00",
      "公開", "", "50",
      "東京都渋谷区〇〇1-2-3", "", "", "",
    ];
    downloadCSV(CSV_HEADERS, [sample], "event-import-template");
  };

  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  }

  const STATUS_MAP: Record<string, string> = {
    "公開": "active", "active": "active",
    "公開停止": "paused", "paused": "paused",
    "中止": "cancelled", "cancelled": "cancelled",
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    setCsvSubmitting(true);
    setCsvResult(null);
    setCsvFatalError(null);

    try {
      const text = await csvFile.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        setCsvFatalError("CSVにデータ行がありません");
        setCsvSubmitting(false);
        return;
      }

      const headers = parseCsvLine(lines[0]);
      const colIndex = (name: string) => headers.indexOf(name);

      const requiredHeaders = ["イベントタイプ名", "開催日", "開始時刻", "終了時刻"];
      const missing = requiredHeaders.filter((h) => colIndex(h) === -1);
      if (missing.length > 0) {
        setCsvFatalError(`必須ヘッダーがありません: ${missing.join(", ")}`);
        setCsvSubmitting(false);
        return;
      }

      const typeMap = new Map(eventTypes.map((t) => [t.name, t.id]));
      let created = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        const get = (name: string) => {
          const idx = colIndex(name);
          return idx >= 0 ? cols[idx] ?? "" : "";
        };

        const typeName = get("イベントタイプ名");
        const typeId = typeMap.get(typeName);
        if (!typeId) {
          errors.push({ row: i + 1, message: `イベントタイプ「${typeName}」が見つかりません` });
          continue;
        }

        const eventDate = get("開催日");
        const startTime = get("開始時刻");
        const endTime = get("終了時刻");
        if (!eventDate || !startTime || !endTime) {
          errors.push({ row: i + 1, message: "開催日・開始時刻・終了時刻は必須です" });
          continue;
        }

        const statusRaw = get("ステータス");
        const status = statusRaw ? (STATUS_MAP[statusRaw] ?? "active") : "active";
        const targetAttendanceRaw = get("集客目標数");

        const { error: createErr } = await createEvent({
          event_type_id: typeId,
          event_date: eventDate,
          start_time: startTime,
          end_time: endTime,
          status,
          gathering_time: get("集合時間") || null,
          display_name: get("フロント表示名") || null,
          target_attendance: targetAttendanceRaw ? Number(targetAttendanceRaw) : null,
          venue_address: get("会場住所") || null,
          google_maps_url: get("GoogleマップURL") || null,
          form_label: get("フォームラベル") || null,
          form_area: get("フォームエリア") || null,
        });

        if (createErr) {
          errors.push({ row: i + 1, message: createErr });
        } else {
          created++;
        }
      }

      setCsvResult({ created, errors });
      if (created > 0) {
        setPage(0);
        loadEvents(0);
      }
    } catch {
      setCsvFatalError("CSVの読み込みに失敗しました");
    }
    setCsvSubmitting(false);
  };

  const handleCreateEvent = async () => {
    if (!createForm.event_type_id || !createForm.event_date || !createForm.start_time || !createForm.end_time) {
      setFormError("すべての項目を入力してください");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const { data, error: createError } = await createEvent({
      event_type_id: createForm.event_type_id,
      event_date: createForm.event_date,
      start_time: createForm.start_time,
      end_time: createForm.end_time,
      gathering_time: createForm.gathering_time || null,
      display_name: createForm.display_name || null,
      target_attendance: createForm.target_attendance ? Number(createForm.target_attendance) : null,
      venue_address: createForm.venue_address || null,
      google_maps_url: createForm.google_maps_url || null,
      form_label: createForm.form_label || null,
      form_area: createForm.form_area || null,
      status: createForm.status,
    });

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
      <div className="flex justify-end gap-3">
        <StudioButton variant="outline" icon={<FileUp className="w-4 h-4" />} onClick={handleOpenCsvModal}>
          CSVでイベントを登録
        </StudioButton>
        <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
          新規イベントを作成
        </StudioButton>
      </div>

      {/* フィルタ */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-end flex-wrap">
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-600">ステータス</label>
          <StudioSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">すべて</option>
            <option value="active">公開</option>
            <option value="paused">公開停止</option>
            <option value="cancelled">中止</option>
          </StudioSelect>
        </div>
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
            <option value="date_asc">開催日（古い順）</option>
            <option value="date_desc">開催日（新しい順）</option>
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
                <th className="px-6 py-4">ステータス</th>
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
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>イベントがありません</p>
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        event.status === "active" ? "bg-green-100 text-green-700" :
                        event.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                        event.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {event.status === "active" ? "公開" : event.status === "paused" ? "公開停止" : event.status === "cancelled" ? "中止" : "公開"}
                      </span>
                    </td>
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
                      <span className="text-gray-600">{event.start_time?.slice(0, 5)} 〜 {event.end_time?.slice(0, 5)}</span>
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

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">集合時間</label>
                <input
                  type="time"
                  value={createForm.gathering_time}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, gathering_time: e.target.value }))}
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

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">ステータス</label>
                <StudioSelect
                  value={createForm.status}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value }))}
                  disabled={isSubmitting}
                >
                  <option value="active">公開</option>
                  <option value="paused">公開停止</option>
                  <option value="cancelled">中止</option>
                </StudioSelect>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  フロント表示用イベント名
                  <span className="ml-1 text-xs text-gray-400 font-normal">（空欄→イベントタイプ名を使用）</span>
                </label>
                <input
                  type="text"
                  value={createForm.display_name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  disabled={isSubmitting}
                  placeholder="イベントタイプ名をそのまま使用"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">集客目標数</label>
                <input
                  type="number"
                  min="0"
                  value={createForm.target_attendance}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, target_attendance: e.target.value }))}
                  disabled={isSubmitting}
                  placeholder="管理用（定員制限なし）"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">会場住所</label>
                <input
                  type="text"
                  value={createForm.venue_address}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, venue_address: e.target.value }))}
                  disabled={isSubmitting}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">GoogleマップURL</label>
                <input
                  type="url"
                  value={createForm.google_maps_url}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, google_maps_url: e.target.value }))}
                  disabled={isSubmitting}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    フォーム表示用ラベル
                    <span className="ml-1 text-xs text-gray-400 font-normal">（空欄→タイプ名）</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.form_label}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, form_label: e.target.value }))}
                    disabled={isSubmitting}
                    placeholder="イベントタイプ名を使用"
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">
                    フォーム表示用エリア
                    <span className="ml-1 text-xs text-gray-400 font-normal">（空欄→タイプのエリア）</span>
                  </label>
                  <input
                    type="text"
                    value={createForm.form_area}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, form_area: e.target.value }))}
                    disabled={isSubmitting}
                    placeholder="イベントタイプのエリアを使用"
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

      {/* CSV取り込みモーダル */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !csvSubmitting && setIsCsvModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsCsvModalOpen(false)} disabled={csvSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50">
              <X className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">CSVでイベントを登録</h2>
              <p className="text-sm text-gray-600">UTF-8のCSVファイルでイベントを一括登録できます。</p>
            </div>
            <div className="p-8 space-y-4">
              {csvFatalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{csvFatalError}</p>
                </div>
              )}
              {csvResult && (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-green-800">成功 {csvResult.created} 件</p>
                  </div>
                  {csvResult.errors.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-bold text-amber-800 mb-2">失敗 {csvResult.errors.length} 件</p>
                      <ul className="text-xs text-amber-800 list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                        {csvResult.errors.map((e, i) => <li key={i}>{e.row}行目: {e.message}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CSVファイル</label>
                <input type="file" accept=".csv"
                  onChange={(e) => { const f = e.target.files?.[0]; setCsvFile(f ?? null); if (!f) setCsvResult(null); }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                  disabled={csvSubmitting} />
              </div>
              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  <button type="button" onClick={handleDownloadCsvTemplate} className="underline text-red-600 hover:text-red-700 font-bold">
                    テンプレートCSVをダウンロード
                  </button>
                  してフォーマットを確認してください。
                </p>
                <p>「イベントタイプ名」はマスタ登録済みの名前と完全一致が必要です。</p>
                <p>ステータスは「公開」「公開停止」「中止」のいずれか（省略時は「公開」）。</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsCsvModalOpen(false)} disabled={csvSubmitting}>
                閉じる
              </StudioButton>
              <StudioButton variant="primary" onClick={handleCsvImport} disabled={csvSubmitting || !csvFile}>
                {csvSubmitting ? "取り込み中..." : "取り込み"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
