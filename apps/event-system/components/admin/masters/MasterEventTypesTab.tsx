"use client";

import { useState, useCallback } from "react";
import Table from "@/components/ui/table/Table";
import Button from "@/components/ui/Button";
import { useModal } from "@/hooks/useModal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types";
import MasterEventTypeFormModal from "./MasterEventTypeFormModal";

type MasterEventType = Database["public"]["Tables"]["event_types"]["Row"];

type MasterEventTypesTabProps = {
  eventTypes: MasterEventType[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
};

const headers: { label: string; key: keyof MasterEventType }[] = [
  { label: "イベント名", key: "name" },
  { label: "対象卒年度", key: "target_graduation_year" },
  { label: "エリア", key: "area" },
  { label: "状態", key: "is_active" },
];

export default function MasterEventTypesTab({
  eventTypes,
  isLoading,
  onRefresh,
}: MasterEventTypesTabProps) {
  const createModal = useModal();
  const editModal = useModal();
  const [editingEventType, setEditingEventType] = useState<MasterEventType | null>(null);

  const handleCreate = useCallback(() => {
    setEditingEventType(null);
    createModal.open();
  }, [createModal]);

  const handleEdit = useCallback(
    (eventType: MasterEventType) => {
      setEditingEventType(eventType);
      editModal.open();
    },
    [editModal]
  );

  const handleDelete = useCallback(
    async (eventType: MasterEventType) => {
      if (!confirm(`イベントタイプ「${eventType.name}」を削除しますか？`)) {
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("event_types")
          .delete()
          .eq("id", eventType.id);

        if (error) {
          console.error("削除エラー:", error);
          alert("削除に失敗しました");
          return;
        }

        await onRefresh();
      } catch (error) {
        console.error("削除エラー:", error);
        alert("削除に失敗しました");
      }
    },
    [onRefresh]
  );

  const handleToggleActive = useCallback(
    async (eventType: MasterEventType) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("event_types")
          .update({ is_active: !eventType.is_active })
          .eq("id", eventType.id);

        if (error) {
          console.error("更新エラー:", error);
          alert("更新に失敗しました");
          return;
        }

        await onRefresh();
      } catch (error) {
        console.error("更新エラー:", error);
        alert("更新に失敗しました");
      }
    },
    [onRefresh]
  );

  const displayData = eventTypes.map((eventType) => ({
    ...eventType,
    target_graduation_year: eventType.target_graduation_year
      ? String(eventType.target_graduation_year)
      : "-",
    area: eventType.area || "-",
    is_active: eventType.is_active ? "有効" : "無効",
  }));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" size="sm" onClick={handleCreate}>
          ＋イベントタイプ追加
        </Button>
      </div>

      <Table
        headers={headers}
        data={displayData}
        isLoading={isLoading}
        renderActions={(row) => {
          const eventType = eventTypes.find(
            (et) => et.id === (row as { id: string }).id
          );
          if (!eventType) return null;
          return (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleEdit(eventType)}
              >
                編集
              </Button>
              <Button
                variant={eventType.is_active ? "secondary" : "success"}
                size="sm"
                onClick={() => handleToggleActive(eventType)}
              >
                {eventType.is_active ? "無効化" : "有効化"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(eventType)}
              >
                削除
              </Button>
            </div>
          );
        }}
      />

      <MasterEventTypeFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSuccess={onRefresh}
      />

      <MasterEventTypeFormModal
        isOpen={editModal.isOpen}
        onClose={editModal.close}
        onSuccess={onRefresh}
        initialData={editingEventType}
      />
    </div>
  );
}

