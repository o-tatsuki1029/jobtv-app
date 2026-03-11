"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioInput from "@/components/studio/atoms/StudioInput";
import type { Tables } from "@jobtv-app/shared/types";
import {
  createEventArea,
  updateEventArea,
} from "@/lib/actions/event-admin-actions";

type EventArea = Tables<"event_areas">;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: EventArea | null;
};

export default function MasterAreaFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: Props) {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setIsActive(initialData.is_active);
    } else {
      setName("");
      setIsActive(true);
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("エリア名は必須です");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    if (isEditMode && initialData) {
      const { error: updateError } = await updateEventArea(initialData.id, {
        name: name.trim(),
        is_active: isActive,
      });
      if (updateError) {
        setError(updateError);
        setIsSubmitting(false);
        return;
      }
    } else {
      const { error: createError } = await createEventArea({ name: name.trim() });
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
            {isEditMode ? "エリア編集" : "エリア追加"}
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
              エリア名 <span className="text-red-500">*</span>
            </label>
            <StudioInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 東京"
              disabled={isSubmitting}
            />
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
