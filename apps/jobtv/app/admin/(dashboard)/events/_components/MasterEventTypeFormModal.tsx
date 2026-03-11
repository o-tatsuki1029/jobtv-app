"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioInput from "@/components/studio/atoms/StudioInput";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import type { Tables } from "@jobtv-app/shared/types";
import {
  getEventAreas,
  getEventGraduationYears,
  createEventType,
  updateEventType,
} from "@/lib/actions/event-admin-actions";

type EventType = Tables<"event_types">;
type EventArea = Tables<"event_areas">;
type EventGraduationYear = Tables<"event_graduation_years">;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: EventType | null;
};

export default function MasterEventTypeFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: Props) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [targetGraduationYear, setTargetGraduationYear] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ドロップダウン用マスタ
  const [areas, setAreas] = useState<EventArea[]>([]);
  const [graduationYears, setGraduationYears] = useState<EventGraduationYear[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (!isOpen) return;
    const loadMasters = async () => {
      setMastersLoading(true);
      const [areasRes, yearsRes] = await Promise.all([
        getEventAreas(),
        getEventGraduationYears(),
      ]);
      if (areasRes.data) setAreas(areasRes.data);
      if (yearsRes.data) setGraduationYears(yearsRes.data);
      setMastersLoading(false);
    };
    loadMasters();
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setArea(initialData.area || "");
      setTargetGraduationYear(
        initialData.target_graduation_year ? String(initialData.target_graduation_year) : ""
      );
      setIsActive(initialData.is_active);
    } else {
      setName("");
      setArea("");
      setTargetGraduationYear("");
      setIsActive(true);
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("イベント名は必須です");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (isEditMode && initialData) {
      const { error: updateError } = await updateEventType(initialData.id, {
        name: name.trim(),
        area: area || null,
        target_graduation_year: targetGraduationYear ? Number(targetGraduationYear) : null,
        is_active: isActive,
      });
      if (updateError) {
        setError(updateError);
        setIsSubmitting(false);
        return;
      }
    } else {
      const { error: createError } = await createEventType({
        name: name.trim(),
        area: area || undefined,
        target_graduation_year: targetGraduationYear ? Number(targetGraduationYear) : undefined,
      });
      if (createError) {
        setError(createError);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 animate-in fade-in duration-200"
        onClick={() => !isSubmitting && onClose()}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isEditMode ? "イベントタイプ編集" : "イベントタイプ追加"}
          </h2>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-bold text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">
              イベント名 <span className="text-red-500">*</span>
            </label>
            <StudioInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 合同説明会"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">エリア</label>
            <StudioSelect
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={isSubmitting || mastersLoading}
            >
              <option value="">{mastersLoading ? "読み込み中..." : "選択しない"}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
            </StudioSelect>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">対象卒業年度</label>
            <StudioSelect
              value={targetGraduationYear}
              onChange={(e) => setTargetGraduationYear(e.target.value)}
              disabled={isSubmitting || mastersLoading}
            >
              <option value="">{mastersLoading ? "読み込み中..." : "選択しない"}</option>
              {graduationYears.map((y) => (
                <option key={y.id} value={y.year.toString()}>{y.year}年卒</option>
              ))}
            </StudioSelect>
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">状態</label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-700">有効</span>
              </label>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <StudioButton variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </StudioButton>
          <StudioButton variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : isEditMode ? "更新" : "作成"}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
