"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/modals/Modal";
import ModalHeader from "@/components/ui/modals/ModalHeader";
import Button from "@/components/ui/Button";
import { FormField, NumberInput } from "@/components/ui/form/FormField";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types";

type MasterGraduationYear = Database["public"]["Tables"]["event_graduation_years"]["Row"];

type MasterGraduationYearFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  initialData?: MasterGraduationYear | null;
};

export default function MasterGraduationYearFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: MasterGraduationYearFormModalProps) {
  const [year, setYear] = useState(2025);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setYear(initialData.year);
      setIsActive(initialData.is_active);
    } else {
      setYear(new Date().getFullYear() + 1);
      setIsActive(true);
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!year || year < 2000 || year > 2100) {
        setError("卒年度は2000年から2100年の間で入力してください");
        setIsSubmitting(false);
        return;
      }

      const supabase = createClient();

      if (isEditMode && initialData) {
        // 更新
        const { error: updateError } = await supabase
          .from("event_graduation_years")
          .update({
            year,
            is_active: isActive,
          })
          .eq("id", initialData.id);

        if (updateError) {
          setError(updateError.message || "更新に失敗しました");
          setIsSubmitting(false);
          return;
        }
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from("event_graduation_years")
          .insert({
            year,
            is_active: isActive,
          });

        if (insertError) {
          setError(insertError.message || "作成に失敗しました");
          setIsSubmitting(false);
          return;
        }
      }

      await onSuccess();
      onClose();
    } catch (err) {
      console.error("エラー:", err);
      setError("予期しないエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <form onSubmit={handleSubmit} className="w-full pb-6">
        <ModalHeader title={isEditMode ? "卒年度編集" : "卒年度追加"} />

        <FormField label="卒年度">
          <NumberInput
            name="year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            min={2000}
            max={2100}
            required
          />
        </FormField>

        <FormField label="状態">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">有効</span>
          </label>
        </FormField>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : isEditMode ? "更新" : "作成"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

