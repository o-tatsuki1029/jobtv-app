"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Plus, X, GripVertical, Pencil, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import EmptyState from "@/components/studio/atoms/EmptyState";
import {
  getAdminLpCompanyLogos,
  createLpCompanyLogo,
  updateLpCompanyLogo,
  deleteLpCompanyLogo,
  reorderLpCompanyLogos
} from "@/lib/actions/lp-company-logo-actions";

type CompanyLogo = {
  id: string;
  name: string;
  image_url: string;
  row_position: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

function SortableLogoItem({
  logo,
  onEdit,
  onDelete,
  isSortable
}: {
  logo: CompanyLogo;
  onEdit: (logo: CompanyLogo) => void;
  onDelete: (id: string) => void;
  isSortable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: logo.id,
    disabled: !isSortable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
    >
      {isSortable && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-gray-600 touch-none"
          title="ドラッグして並び替え"
          aria-label="並び替え"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        <Image
          src={logo.image_url}
          alt={logo.name}
          fill
          className="object-contain"
          sizes="64px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{logo.name}</p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(logo)}
        className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        title="編集"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(logo.id)}
        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="削除"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function LogoForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel
}: {
  initialValues?: { name: string; row_position: string };
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await onSubmit(formData);
      if (!initialValues) {
        formRef.current?.reset();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      {formError && <ErrorMessage message={formError} />}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          企業名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          defaultValue={initialValues?.name ?? ""}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="株式会社○○"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          表示位置 <span className="text-red-500">*</span>
        </label>
        <select
          name="row_position"
          defaultValue={initialValues?.row_position ?? "top"}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
        >
          <option value="top">上段</option>
          <option value="bottom">下段</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ロゴ画像{!initialValues && <span className="text-red-500"> *</span>}
          {initialValues && <span className="text-gray-400 text-xs ml-1">（変更する場合のみ選択）</span>}
        </label>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required={!initialValues}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {initialValues ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {submitting ? "保存中..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}

function LogoSection({
  title,
  logos,
  rowPosition,
  sensors,
  onDragEnd,
  onEdit,
  onDelete,
  isReordering,
  editingLogo,
  onUpdate,
  onCancelEdit
}: {
  title: string;
  logos: CompanyLogo[];
  rowPosition: string;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent, rowPosition: string) => void;
  onEdit: (logo: CompanyLogo) => void;
  onDelete: (id: string) => void;
  isReordering: boolean;
  editingLogo: CompanyLogo | null;
  onUpdate: (formData: FormData) => Promise<void>;
  onCancelEdit: () => void;
}) {
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-gray-700">
        {title}（{logos.length}社）
      </h3>
      {logos.length === 0 ? (
        <p className="text-sm text-gray-400">ロゴがありません</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e) => onDragEnd(e, rowPosition)}
        >
          <SortableContext
            items={logos.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2 max-h-[400px] overflow-y-auto">
              {logos.map((logo) => (
                <React.Fragment key={logo.id}>
                  <SortableLogoItem
                    logo={logo}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    isSortable={logos.length > 1}
                  />
                  {editingLogo?.id === logo.id && (
                    <li className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <p className="mb-3 text-sm font-medium text-blue-800">ロゴを編集</p>
                      <LogoForm
                        initialValues={{
                          name: editingLogo.name,
                          row_position: editingLogo.row_position
                        }}
                        onSubmit={onUpdate}
                        onCancel={onCancelEdit}
                        submitLabel="更新する"
                      />
                    </li>
                  )}
                </React.Fragment>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default function LpCompanyLogosContent() {
  const [logos, setLogos] = useState<CompanyLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [editingLogo, setEditingLogo] = useState<CompanyLogo | null>(null);

  const fetchLogos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLpCompanyLogos();
      if (res.error) throw new Error(res.error);
      setLogos(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const topLogos = logos.filter((l) => l.row_position === "top");
  const bottomLogos = logos.filter((l) => l.row_position === "bottom");

  const handleDragEnd = async (event: DragEndEvent, rowPosition: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const rowLogos = rowPosition === "top" ? topLogos : bottomLogos;
    const oldIndex = rowLogos.findIndex((l) => l.id === active.id);
    const newIndex = rowLogos.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(rowLogos, oldIndex, newIndex);
    const otherLogos = rowPosition === "top" ? bottomLogos : topLogos;
    setLogos(rowPosition === "top" ? [...newOrder, ...otherLogos] : [...otherLogos, ...newOrder]);

    setIsReordering(true);
    setActionError(null);
    const res = await reorderLpCompanyLogos(
      newOrder.map((l) => l.id),
      rowPosition
    );
    setIsReordering(false);
    if (res.error) {
      setActionError(res.error);
      await fetchLogos();
    }
  };

  const handleCreate = async (formData: FormData) => {
    setActionError(null);
    const res = await createLpCompanyLogo(formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchLogos();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingLogo) return;
    setActionError(null);
    const res = await updateLpCompanyLogo(editingLogo.id, formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setEditingLogo(null);
    await fetchLogos();
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const res = await deleteLpCompanyLogo(id);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchLogos();
  };

  if (loading) {
    return <LoadingSpinner message="読み込み中..." />;
  }

  return (
    <div className="space-y-6">
      {error && <ErrorMessage message={error} />}
      {actionError && <ErrorMessage message={actionError} />}

      {isReordering && (
        <div className="flex items-center justify-center py-2 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 text-xs font-bold animate-pulse">
          並び替えを保存中...
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">現在の企業ロゴ</h2>
          {logos.length === 0 ? (
            <EmptyState
              title="企業ロゴがありません"
              description="右のフォームからロゴを追加してください"
            />
          ) : (
            <>
              <LogoSection
                title="上段"
                logos={topLogos}
                rowPosition="top"
                sensors={sensors}
                onDragEnd={handleDragEnd}
                onEdit={setEditingLogo}
                onDelete={handleDelete}
                isReordering={isReordering}
                editingLogo={editingLogo}
                onUpdate={handleUpdate}
                onCancelEdit={() => setEditingLogo(null)}
              />
              <LogoSection
                title="下段"
                logos={bottomLogos}
                rowPosition="bottom"
                sensors={sensors}
                onDragEnd={handleDragEnd}
                onEdit={setEditingLogo}
                onDelete={handleDelete}
                isReordering={isReordering}
                editingLogo={editingLogo}
                onUpdate={handleUpdate}
                onCancelEdit={() => setEditingLogo(null)}
              />
            </>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">新規ロゴを追加</h2>
          <LogoForm onSubmit={handleCreate} submitLabel="追加する" />
        </section>
      </div>
    </div>
  );
}
