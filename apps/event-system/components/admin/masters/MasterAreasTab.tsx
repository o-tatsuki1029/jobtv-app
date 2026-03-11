"use client";

import { useState, useCallback } from "react";
import Table from "@/components/ui/table/Table";
import Button from "@/components/ui/Button";
import { useModal } from "@/hooks/useModal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types";
import MasterAreaFormModal from "./MasterAreaFormModal";

type MasterArea = Database["public"]["Tables"]["event_areas"]["Row"];

type MasterAreasTabProps = {
  areas: MasterArea[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
};

const headers: { label: string; key: keyof MasterArea }[] = [
  { label: "エリア名", key: "name" },
  { label: "状態", key: "is_active" },
];

export default function MasterAreasTab({
  areas,
  isLoading,
  onRefresh,
}: MasterAreasTabProps) {
  const createModal = useModal();
  const editModal = useModal();
  const [editingArea, setEditingArea] = useState<MasterArea | null>(null);

  const handleCreate = useCallback(() => {
    setEditingArea(null);
    createModal.open();
  }, [createModal]);

  const handleEdit = useCallback(
    (area: MasterArea) => {
      setEditingArea(area);
      editModal.open();
    },
    [editModal],
  );

  const handleDelete = useCallback(
    async (area: MasterArea) => {
      if (!confirm(`エリア「${area.name}」を削除しますか？`)) {
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("event_areas")
          .delete()
          .eq("id", area.id);

        if (error) {
          alert(`削除に失敗しました: ${error.message}`);
          return;
        }

        await onRefresh();
      } catch (error) {
        console.error("削除エラー:", error);
        alert("削除に失敗しました");
      }
    },
    [onRefresh],
  );

  const handleToggleActive = useCallback(
    async (area: MasterArea) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("event_areas")
          .update({ is_active: !area.is_active })
          .eq("id", area.id);

        if (error) {
          alert(`更新に失敗しました: ${error.message}`);
          return;
        }

        await onRefresh();
      } catch (error) {
        console.error("更新エラー:", error);
        alert("更新に失敗しました");
      }
    },
    [onRefresh],
  );

  const displayData = areas.map((area) => ({
    ...area,
    is_active: area.is_active ? "有効" : "無効",
  }));

  return (
    <div>
      {/* 作成モーダル */}
      <MasterAreaFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSuccess={onRefresh}
      />

      {/* 編集モーダル */}
      {editingArea && (
        <MasterAreaFormModal
          isOpen={editModal.isOpen}
          onClose={editModal.close}
          onSuccess={onRefresh}
          initialData={editingArea}
        />
      )}

      {/* アクションボタン */}
      <div className="my-5 flex justify-end">
        <Button variant="primary" size="lg" onClick={handleCreate}>
          ＋エリア追加
        </Button>
      </div>

      {/* テーブル */}
      <Table
        headers={headers}
        data={displayData}
        isLoading={isLoading}
        renderActions={(row) => {
          const area = areas.find((a) => a.id === (row as { id: string }).id);
          if (!area) return null;
          return (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleEdit(area)}
              >
                編集
              </Button>
              <Button
                variant={area.is_active ? "secondary" : "success"}
                size="sm"
                onClick={() => handleToggleActive(area)}
              >
                {area.is_active ? "無効化" : "有効化"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(area)}
              >
                削除
              </Button>
            </div>
          );
        }}
      />
    </div>
  );
}
