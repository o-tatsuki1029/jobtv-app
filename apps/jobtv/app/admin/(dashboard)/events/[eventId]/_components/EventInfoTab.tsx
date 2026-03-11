"use client";

import React, { useState, useEffect } from "react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import {
  getEventTypes,
  updateEvent,
  getEventById,
} from "@/lib/actions/event-admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

type EventType = Tables<"event_types">;
type EventWithType = Tables<"events"> & { event_types: EventType | null };

interface EventInfoTabProps {
  event: EventWithType;
  onEventUpdate: (event: EventWithType) => void;
}

export default function EventInfoTab({ event, onEventUpdate }: EventInfoTabProps) {
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  const [form, setForm] = useState({
    event_type_id: event.event_type_id || "",
    event_date: event.event_date || "",
    start_time: event.start_time || "",
    end_time: event.end_time || "",
    gathering_time: event.gathering_time || "",
    display_name: event.display_name || "",
    target_attendance: event.target_attendance != null ? String(event.target_attendance) : "",
    venue_address: event.venue_address || "",
    google_maps_url: event.google_maps_url || "",
    form_label: event.form_label || "",
    form_area: event.form_area || "",
    status: event.status || "active",
  });

  useEffect(() => {
    const load = async () => {
      const res = await getEventTypes();
      if (res.data) setEventTypes(res.data);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!form.event_type_id || !form.event_date || !form.start_time || !form.end_time) {
      setSaveError("すべての項目を入力してください");
      return;
    }

    setSaveLoading(true);
    setSaveError(null);
    setSaveSuccess(false);

    const { error } = await updateEvent(event.id, {
      event_type_id: form.event_type_id,
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      gathering_time: form.gathering_time || null,
      display_name: form.display_name || null,
      target_attendance: form.target_attendance ? Number(form.target_attendance) : null,
      venue_address: form.venue_address || null,
      google_maps_url: form.google_maps_url || null,
      form_label: form.form_label || null,
      form_area: form.form_area || null,
      status: form.status,
    });

    if (error) {
      setSaveError(error);
      setSaveLoading(false);
      return;
    }

    // 更新後のデータを再取得
    const updated = await getEventById(event.id);
    if (updated.data) {
      onEventUpdate(updated.data);
    }

    setSaveSuccess(true);
    setSaveLoading(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-bold text-red-800">{saveError}</p>
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800">保存しました</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">
          イベントタイプ <span className="text-red-500">*</span>
        </label>
        <StudioSelect
          value={form.event_type_id}
          onChange={(e) => setForm((prev) => ({ ...prev, event_type_id: e.target.value }))}
          disabled={saveLoading}
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
          value={form.event_date}
          onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
          disabled={saveLoading}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">集合時間</label>
        <input
          type="time"
          value={form.gathering_time}
          onChange={(e) => setForm((prev) => ({ ...prev, gathering_time: e.target.value }))}
          disabled={saveLoading}
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
            value={form.start_time}
            onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            disabled={saveLoading}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">
            終了時刻 <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
            disabled={saveLoading}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">ステータス</label>
        <StudioSelect
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
          disabled={saveLoading}
        >
          <option value="active">active（公開）</option>
          <option value="paused">paused（公開停止）</option>
          <option value="cancelled">cancelled（中止）</option>
        </StudioSelect>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">
          フロント表示用イベント名
          <span className="ml-1 text-xs text-gray-400 font-normal">（空欄→イベントタイプ名を使用）</span>
        </label>
        <input
          type="text"
          value={form.display_name}
          onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
          disabled={saveLoading}
          placeholder="イベントタイプ名をそのまま使用"
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">集客目標数</label>
        <input
          type="number"
          min="0"
          value={form.target_attendance}
          onChange={(e) => setForm((prev) => ({ ...prev, target_attendance: e.target.value }))}
          disabled={saveLoading}
          placeholder="管理用（定員制限なし）"
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">会場住所</label>
        <input
          type="text"
          value={form.venue_address}
          onChange={(e) => setForm((prev) => ({ ...prev, venue_address: e.target.value }))}
          disabled={saveLoading}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-bold text-gray-700">GoogleマップURL</label>
        <input
          type="url"
          value={form.google_maps_url}
          onChange={(e) => setForm((prev) => ({ ...prev, google_maps_url: e.target.value }))}
          disabled={saveLoading}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">
            フォーム表示用ラベル
            <span className="ml-1 text-xs text-gray-400 font-normal">（空欄→イベントタイプ名）</span>
          </label>
          <input
            type="text"
            value={form.form_label}
            onChange={(e) => setForm((prev) => ({ ...prev, form_label: e.target.value }))}
            disabled={saveLoading}
            placeholder="イベントタイプ名を使用"
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">
            フォーム表示用エリア
            <span className="ml-1 text-xs text-gray-400 font-normal">（空欄→イベントタイプのエリア）</span>
          </label>
          <input
            type="text"
            value={form.form_area}
            onChange={(e) => setForm((prev) => ({ ...prev, form_area: e.target.value }))}
            disabled={saveLoading}
            placeholder="イベントタイプのエリアを使用"
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
          />
        </div>
      </div>

      {/* 読み取り専用情報 */}
      <div className="border-t border-gray-200 pt-6 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-gray-500 w-24">作成者:</span>
          <span className="text-gray-700">{event.created_by || "-"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-gray-500 w-24">作成日時:</span>
          <span className="text-gray-700">{event.created_at ? new Date(event.created_at).toLocaleString("ja-JP") : "-"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-gray-500 w-24">更新日時:</span>
          <span className="text-gray-700">{event.updated_at ? new Date(event.updated_at).toLocaleString("ja-JP") : "-"}</span>
        </div>
      </div>

      <div className="flex justify-end">
        <StudioButton variant="primary" onClick={handleSave} disabled={saveLoading}>
          {saveLoading ? "保存中..." : "保存"}
        </StudioButton>
      </div>
    </div>
  );
}
