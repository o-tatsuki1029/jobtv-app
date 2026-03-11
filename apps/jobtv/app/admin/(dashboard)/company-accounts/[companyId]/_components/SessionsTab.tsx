"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Pencil, Trash2 } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import {
  adminGetSessionsForCompany,
  adminSaveSession,
  adminUploadSessionCoverImage,
} from "@/lib/actions/admin-company-detail-actions";

interface SessionsTabProps {
  companyId: string;
}

const SESSION_TYPES = [
  { value: "", label: "選択してください" },
  { value: "説明会", label: "説明会" },
  { value: "インターンシップ", label: "インターンシップ" },
  { value: "その他", label: "その他" },
];

const LOCATION_TYPES = [
  { value: "", label: "選択してください" },
  { value: "対面", label: "対面" },
  { value: "オンライン", label: "オンライン" },
  { value: "対面とオンライン", label: "対面とオンライン" },
];

interface DateRow {
  event_date: string;
  start_time: string;
  end_time: string;
  capacity: string;
}

export default function SessionsTab({ companyId }: SessionsTabProps) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    type: "",
    location_type: "",
    location_detail: "",
    capacity: "",
    graduation_year: "",
    description: "",
    cover_image_url: "",
  });

  const [dateRows, setDateRows] = useState<DateRow[]>([
    { event_date: "", start_time: "", end_time: "", capacity: "" },
  ]);

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await adminGetSessionsForCompany(companyId);
    if (data) setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSessions();
  }, [companyId]);

  const openCreateModal = () => {
    setEditingSession(null);
    setForm({
      title: "",
      type: "",
      location_type: "",
      location_detail: "",
      capacity: "",
      graduation_year: "",
      description: "",
      cover_image_url: "",
    });
    setDateRows([{ event_date: "", start_time: "", end_time: "", capacity: "" }]);
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (session: any) => {
    setEditingSession(session);
    setForm({
      title: session.title || "",
      type: session.type || "",
      location_type: session.location_type || "",
      location_detail: session.location_detail || "",
      capacity: session.capacity?.toString() || "",
      graduation_year: session.graduation_year?.toString() || "",
      description: session.description || "",
      cover_image_url: session.cover_image_url || "",
    });
    setDateRows(
      session.dates && session.dates.length > 0
        ? session.dates.map((d: any) => ({
            event_date: d.event_date || "",
            start_time: d.start_time ? d.start_time.slice(0, 5) : "",
            end_time: d.end_time ? d.end_time.slice(0, 5) : "",
            capacity: d.capacity?.toString() || "",
          }))
        : [{ event_date: "", start_time: "", end_time: "", capacity: "" }]
    );
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setSaveError("タイトルは必須です");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const validDates = dateRows
      .filter((d) => d.event_date && d.start_time && d.end_time)
      .map((d) => ({
        event_date: d.event_date,
        start_time: d.start_time,
        end_time: d.end_time,
        capacity: d.capacity ? parseInt(d.capacity) : null,
      }));

    const { error } = await adminSaveSession(
      companyId,
      editingSession?.id || null,
      {
        title: form.title,
        type: form.type || null,
        location_type: form.location_type || null,
        location_detail: form.location_detail || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
        description: form.description || null,
        cover_image_url: form.cover_image_url || null,
      },
      validDates
    );

    if (error) {
      setSaveError(error);
    } else {
      setIsModalOpen(false);
      await loadSessions();
    }
    setSaving(false);
  };

  const addDateRow = () => {
    setDateRows([...dateRows, { event_date: "", start_time: "", end_time: "", capacity: "" }]);
  };

  const removeDateRow = (index: number) => {
    if (dateRows.length <= 1) return;
    setDateRows(dateRows.filter((_, i) => i !== index));
  };

  const updateDateRow = (index: number, field: keyof DateRow, value: string) => {
    const newRows = [...dateRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setDateRows(newRows);
  };

  const getStatusBadge = (session: any) => {
    if (session.production_status === "active") return <StudioBadge variant="success">公開中</StudioBadge>;
    if (session.production_session_id) return <StudioBadge variant="neutral">非公開</StudioBadge>;
    return <StudioBadge variant="warning">{session.draft_status === "submitted" ? "審査中" : "下書き"}</StudioBadge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">説明会一覧（{sessions.length}件）</h2>
          <StudioButton icon={<Plus className="w-4 h-4" />} size="sm" onClick={openCreateModal}>
            新規説明会
          </StudioButton>
        </div>
        <div className="overflow-x-auto">
          {sessions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <p>説明会がありません</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                  <th className="px-6 py-4">タイトル</th>
                  <th className="px-6 py-4">タイプ</th>
                  <th className="px-6 py-4">場所</th>
                  <th className="px-6 py-4">卒業年度</th>
                  <th className="px-6 py-4">ステータス</th>
                  <th className="px-6 py-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{session.title || "無題"}</td>
                    <td className="px-6 py-4 text-gray-600">{session.type || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{session.location_type || "-"}</td>
                    <td className="px-6 py-4 text-gray-600">{session.graduation_year ? `${session.graduation_year}年卒` : "-"}</td>
                    <td className="px-6 py-4">{getStatusBadge(session)}</td>
                    <td className="px-6 py-4">
                      <StudioButton
                        variant="outline"
                        size="sm"
                        icon={<Pencil className="w-3 h-3" />}
                        onClick={() => openEditModal(session)}
                      >
                        編集
                      </StudioButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 説明会編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
            onClick={() => !saving && setIsModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 z-10"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSession ? "説明会を編集" : "新規説明会"}
              </h2>
            </div>

            <div className="p-8 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-800">{saveError}</p>
                </div>
              )}

              <StudioFormField
                label="タイトル"
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="説明会タイトル（32字以内）"
                maxLength={32}
                showCharCount
                required
                disabled={saving}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <StudioLabel htmlFor="session_type">タイプ</StudioLabel>
                  <StudioSelect
                    id="session_type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    disabled={saving}
                  >
                    {SESSION_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </StudioSelect>
                </div>
                <div className="space-y-2">
                  <StudioLabel htmlFor="location_type">開催形式</StudioLabel>
                  <StudioSelect
                    id="location_type"
                    value={form.location_type}
                    onChange={(e) => setForm({ ...form, location_type: e.target.value })}
                    disabled={saving}
                  >
                    {LOCATION_TYPES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </StudioSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <StudioFormField
                  label="場所詳細"
                  name="location_detail"
                  value={form.location_detail}
                  onChange={(e) => setForm({ ...form, location_detail: e.target.value })}
                  placeholder="例: 本社ビル 3F"
                  maxLength={32}
                  disabled={saving}
                />
                <StudioFormField
                  label="定員"
                  name="capacity"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="例: 30"
                  disabled={saving}
                />
              </div>

              <StudioFormField
                label="卒業年度"
                name="graduation_year"
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                placeholder="例: 2027"
                disabled={saving}
              />

              <StudioFormField
                label="説明"
                name="description"
                type="textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                maxLength={3000}
                showCharCount
                disabled={saving}
              />

              <StudioImageUpload
                label="カバー画像"
                type="cover"
                currentUrl={form.cover_image_url}
                onUploadComplete={(url) => setForm({ ...form, cover_image_url: url })}
                aspectRatio="video"
                customUploadFunction={(file) => adminUploadSessionCoverImage(companyId, file)}
                disabled={saving}
              />

              {/* 日程サブフォーム */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-gray-700">日程</label>
                  <StudioButton
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={addDateRow}
                    disabled={saving}
                  >
                    日程を追加
                  </StudioButton>
                </div>
                {dateRows.map((row, index) => (
                  <div key={index} className="flex items-end gap-2 bg-gray-50 rounded-lg p-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-bold text-gray-500">日付</label>
                      <input
                        type="date"
                        value={row.event_date}
                        onChange={(e) => updateDateRow(index, "event_date", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        disabled={saving}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-xs font-bold text-gray-500">開始</label>
                      <input
                        type="time"
                        value={row.start_time}
                        onChange={(e) => updateDateRow(index, "start_time", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        disabled={saving}
                      />
                    </div>
                    <div className="w-24 space-y-1">
                      <label className="text-xs font-bold text-gray-500">終了</label>
                      <input
                        type="time"
                        value={row.end_time}
                        onChange={(e) => updateDateRow(index, "end_time", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        disabled={saving}
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <label className="text-xs font-bold text-gray-500">定員</label>
                      <input
                        type="number"
                        value={row.capacity}
                        onChange={(e) => updateDateRow(index, "capacity", e.target.value)}
                        placeholder="-"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                        disabled={saving}
                      />
                    </div>
                    {dateRows.length > 1 && (
                      <button
                        onClick={() => removeDateRow(index)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        disabled={saving}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : "保存"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
