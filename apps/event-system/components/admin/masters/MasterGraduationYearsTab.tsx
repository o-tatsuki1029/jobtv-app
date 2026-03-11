"use client";

import { useState, useCallback } from "react";
import Table from "@/components/ui/table/Table";
import Button from "@/components/ui/Button";
import { useModal } from "@/hooks/useModal";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types";
import MasterGraduationYearFormModal from "./MasterGraduationYearFormModal";

type MasterGraduationYear = Database["public"]["Tables"]["event_graduation_years"]["Row"];

type MasterGraduationYearsTabProps = {
  graduationYears: MasterGraduationYear[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
};

const headers: { label: string; key: keyof MasterGraduationYear }[] = [
  { label: "卒年度", key: "year" },
  { label: "状態", key: "is_active" },
];

export default function MasterGraduationYearsTab({
  graduationYears,
  isLoading,
  onRefresh,
}: MasterGraduationYearsTabProps) {
  const createModal = useModal();
  const editModal = useModal();
  const [editingYear, setEditingYear] = useState<MasterGraduationYear | null>(null);

  const handleCreate = useCallback(() => {
    setEditingYear(null);
    createModal.open();
  }, [createModal]);

  const handleEdit = useCallback(
    (year: MasterGraduationYear) => {
      setEditingYear(year);
      editModal.open();
    },
    [editModal]
  );

  const handleDelete = useCallback(
    async (year: MasterGraduationYear) => {
      if (!confirm(`卒年度「${year.year}」を削除しますか？`)) {
        return;
      }

      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("event_graduation_years")
          .delete()
          .eq("id", year.id);

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
    [onRefresh]
  );

  const handleToggleActive = useCallback(
    async (year: MasterGraduationYear) => {
      try {
        const supabase = createClient();
        const { error } = await supabase
          .from("event_graduation_years")
          .update({ is_active: !year.is_active })
          .eq("id", year.id);

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
    [onRefresh]
  );

  const displayData = graduationYears.map((year) => ({
    ...year,
    is_active: year.is_active ? "有効" : "無効",
  }));

  return (
    <div>
      {/* 作成モーダル */}
      <MasterGraduationYearFormModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSuccess={onRefresh}
      />

      {/* 編集モーダル */}
      {editingYear && (
        <MasterGraduationYearFormModal
          isOpen={editModal.isOpen}
          onClose={editModal.close}
          onSuccess={onRefresh}
          initialData={editingYear}
        />
      )}

      {/* アクションボタン */}
      <div className="my-5 flex justify-end">
        <Button variant="primary" size="lg" onClick={handleCreate}>
          ＋卒年度追加
        </Button>
      </div>

      {/* テーブル */}
      <Table
        headers={headers}
        data={displayData}
        isLoading={isLoading}
        renderActions={(row) => {
          const year = graduationYears.find(
            (y) => y.id === (row as { id: string }).id
          );
          if (!year) return null;
          return (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleEdit(year)}
              >
                編集
              </Button>
              <Button
                variant={year.is_active ? "secondary" : "success"}
                size="sm"
                onClick={() => handleToggleActive(year)}
              >
                {year.is_active ? "無効化" : "有効化"}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(year)}
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

