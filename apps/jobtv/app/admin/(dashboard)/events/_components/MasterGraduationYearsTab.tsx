"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import {
  getAllEventGraduationYears,
  updateEventGraduationYear,
  deleteEventGraduationYear,
} from "@/lib/actions/event-admin-actions";
import type { Tables } from "@jobtv-app/shared/types";
import MasterGraduationYearFormModal from "./MasterGraduationYearFormModal";

type EventGraduationYear = Tables<"event_graduation_years">;

export default function MasterGraduationYearsTab() {
  const [graduationYears, setGraduationYears] = useState<EventGraduationYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<EventGraduationYear | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await getAllEventGraduationYears();
    if (fetchError) {
      setError(fetchError);
    } else {
      setGraduationYears(data || []);
    }
    setLoading(false);
    setInitialLoaded(true);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = () => {
    setEditingYear(null);
    setIsModalOpen(true);
  };

  const handleEdit = (year: EventGraduationYear) => {
    setEditingYear(year);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (year: EventGraduationYear) => {
    const { error: updateError } = await updateEventGraduationYear(year.id, {
      is_active: !year.is_active,
    });
    if (updateError) {
      setError(updateError);
    } else {
      setSuccessMessage(`「${year.year}年卒」を${year.is_active ? "無効" : "有効"}にしました`);
      loadData();
    }
  };

  const handleDelete = async (year: EventGraduationYear) => {
    if (!confirm(`卒業年度「${year.year}」を削除しますか？`)) return;

    const { error: deleteError } = await deleteEventGraduationYear(year.id);
    if (deleteError) {
      setError(deleteError);
    } else {
      setSuccessMessage(`「${year.year}年卒」を削除しました`);
      loadData();
    }
  };

  const handleModalSuccess = () => {
    setSuccessMessage(editingYear ? "卒業年度を更新しました" : "卒業年度を作成しました");
    loadData();
  };

  if (!initialLoaded) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-bold text-red-800">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-600 underline mt-1">閉じる</button>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-bold text-green-800">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="text-xs text-green-600 underline mt-1">閉じる</button>
        </div>
      )}

      <div className="flex justify-end">
        <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
          卒業年度追加
        </StudioButton>
      </div>

      <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-opacity duration-150 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4">卒業年度</th>
                <th className="px-6 py-4">状態</th>
                <th className="px-6 py-4">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {graduationYears.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                    卒業年度が登録されていません
                  </td>
                </tr>
              ) : (
                graduationYears.map((year) => (
                  <tr key={year.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{year.year}年卒</span>
                    </td>
                    <td className="px-6 py-4">
                      {year.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">有効</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">無効</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <StudioButton variant="outline" size="sm" icon={<Pencil className="w-3 h-3" />} onClick={() => handleEdit(year)}>
                          編集
                        </StudioButton>
                        <StudioButton
                          variant="secondary"
                          size="sm"
                          icon={year.is_active ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                          onClick={() => handleToggleActive(year)}
                        >
                          {year.is_active ? "無効化" : "有効化"}
                        </StudioButton>
                        <StudioButton variant="danger" size="sm" icon={<Trash2 className="w-3 h-3" />} onClick={() => handleDelete(year)}>
                          削除
                        </StudioButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MasterGraduationYearFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        initialData={editingYear}
      />
    </div>
  );
}
