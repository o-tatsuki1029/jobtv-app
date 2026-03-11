"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/modals/Modal";
import ModalHeader from "@/components/ui/modals/ModalHeader";
import Button from "@/components/ui/Button";
import { FormField, TextInput } from "@/components/ui/form/FormField";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types";

type MasterArea = Database["public"]["Tables"]["event_areas"]["Row"];

type MasterAreaFormModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  initialData?: MasterArea | null;
};

export default function MasterAreaFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: MasterAreaFormModalProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!name.trim()) {
        setError("エリア名は必須です");
        setIsSubmitting(false);
        return;
      }

      const supabase = createClient();

      if (isEditMode && initialData) {
        // 更新
        const { error: updateError } = await supabase
          .from("event_areas")
          .update({
            name: name.trim(),
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
          .from("event_areas")
          .insert({
            name: name.trim(),
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
        <ModalHeader title={isEditMode ? "エリア編集" : "エリア追加"} />

        <FormField label="エリア名">
          <TextInput
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 東京"
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

