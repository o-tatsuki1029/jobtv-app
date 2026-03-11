"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/modals/Modal";
import ModalHeader from "@/components/ui/modals/ModalHeader";
import { FormField, TextInput, SelectInput } from "@/components/ui/form/FormField";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useMasterData } from "@/hooks/useMasterData";
import type { Database } from "@/types";

type MasterEventType = Database["public"]["Tables"]["event_types"]["Row"];

type MasterEventTypeFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  initialData?: MasterEventType | null;
};

export default function MasterEventTypeFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: MasterEventTypeFormModalProps) {
  const { areas, graduationYears, isLoading: isMasterLoading } = useMasterData();
  const [name, setName] = useState("");
  const [targetGraduationYear, setTargetGraduationYear] = useState<string>("");
  const [area, setArea] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setTargetGraduationYear(
        initialData.target_graduation_year
          ? String(initialData.target_graduation_year)
          : ""
      );
      setArea(initialData.area || "");
      setIsActive(initialData.is_active);
    } else {
      setName("");
      setTargetGraduationYear("");
      setArea("");
      setIsActive(true);
    }
    setError(null);
  }, [initialData, isOpen]);

  const graduationYearOptions = graduationYears
    .filter((year) => year.is_active)
    .map((year) => ({
      value: String(year.year),
      label: String(year.year),
    }));

  const areaOptions = areas
    .filter((area) => area.is_active)
    .map((area) => ({
      value: area.name,
      label: area.name,
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      if (isEditMode && initialData) {
        // 更新
        const { error: updateError } = await supabase
          .from("event_types")
          .update({
            name,
            target_graduation_year: targetGraduationYear
              ? Number(targetGraduationYear)
              : null,
            area: area || null,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", initialData.id);

        if (updateError) {
          setError(updateError.message || "更新に失敗しました");
          return;
        }
      } else {
        // 新規作成
        const { error: insertError } = await supabase
          .from("event_types")
          .insert({
            name,
            target_graduation_year: targetGraduationYear
              ? Number(targetGraduationYear)
              : null,
            area: area || null,
            is_active: isActive,
          });

        if (insertError) {
          setError(insertError.message || "作成に失敗しました");
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
        <ModalHeader title={isEditMode ? "イベントタイプ編集" : "イベントタイプ追加"} />

        <FormField label="イベント名">
          <TextInput
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 合同説明会"
            required
          />
        </FormField>

        <FormField label="対象卒年度">
          <SelectInput
            name="target_graduation_year"
            value={targetGraduationYear}
            onChange={(e) => setTargetGraduationYear(e.target.value)}
            options={graduationYearOptions}
            placeholder={isMasterLoading ? "読み込み中..." : "卒年度を選択"}
            disabled={isMasterLoading}
          />
        </FormField>

        <FormField label="エリア">
          <SelectInput
            name="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            options={areaOptions}
            placeholder={isMasterLoading ? "読み込み中..." : "エリアを選択"}
            disabled={isMasterLoading}
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

        <div className="flex gap-2 justify-end mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "送信中..." : isEditMode ? "更新" : "登録"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

