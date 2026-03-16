"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  getAdminLpFaqItems,
  createLpFaqItem,
  updateLpFaqItem,
  deleteLpFaqItem,
  reorderLpFaqItems
} from "@/lib/actions/lp-faq-actions";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

function SortableFaqItem({
  item,
  onEdit,
  onDelete,
  isSortable
}: {
  item: FaqItem;
  onEdit: (item: FaqItem) => void;
  onDelete: (id: string) => void;
  isSortable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
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
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{item.question}</p>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2 whitespace-pre-line">{item.answer}</p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(item)}
        className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        title="編集"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="削除"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function FaqForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel
}: {
  initialValues?: { question: string; answer: string };
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
          質問 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="question"
          defaultValue={initialValues?.question ?? ""}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="よくある質問を入力"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          回答 <span className="text-red-500">*</span>
        </label>
        <textarea
          name="answer"
          defaultValue={initialValues?.answer ?? ""}
          required
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="回答を入力（改行は表示時にそのまま反映されます）"
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

export default function LpFaqContent() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [editingItem, setEditingItem] = useState<FaqItem | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLpFaqItems();
      if (res.error) throw new Error(res.error);
      setItems(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(items, oldIndex, newIndex);
    setItems(newOrder);

    setIsReordering(true);
    setActionError(null);
    const res = await reorderLpFaqItems(newOrder.map((i) => i.id));
    setIsReordering(false);
    if (res.error) {
      setActionError(res.error);
      await fetchItems();
    }
  };

  const handleCreate = async (formData: FormData) => {
    setActionError(null);
    const res = await createLpFaqItem(formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchItems();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingItem) return;
    setActionError(null);
    const res = await updateLpFaqItem(editingItem.id, formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setEditingItem(null);
    await fetchItems();
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const res = await deleteLpFaqItem(id);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchItems();
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
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">現在のFAQ</h2>
          {items.length === 0 ? (
            <EmptyState
              title="FAQがありません"
              description="右のフォームからFAQを追加してください"
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-3">
                  {items.map((item) => (
                    <React.Fragment key={item.id}>
                      <SortableFaqItem
                        item={item}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                        isSortable={items.length > 1}
                      />
                      {editingItem?.id === item.id && (
                        <li className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <p className="mb-3 text-sm font-medium text-blue-800">FAQを編集</p>
                          <FaqForm
                            initialValues={{
                              question: editingItem.question,
                              answer: editingItem.answer
                            }}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingItem(null)}
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
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">新規FAQを追加</h2>
          <FaqForm onSubmit={handleCreate} submitLabel="追加する" />
        </section>
      </div>
    </div>
  );
}
