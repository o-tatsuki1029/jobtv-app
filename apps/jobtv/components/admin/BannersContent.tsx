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
  getAdminTopPageBanners,
  createTopPageBanner,
  updateTopPageBanner,
  deleteTopPageBanner,
  reorderTopPageBanners
} from "@/lib/actions/top-page-banner-actions";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

function SortableBannerItem({
  banner,
  onEdit,
  onDelete,
  isSortable
}: {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onDelete: (id: string) => void;
  isSortable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: banner.id,
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
      <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        <Image
          src={banner.image_url}
          alt=""
          fill
          className="object-cover"
          sizes="96px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{banner.title}</p>
        {banner.link_url && (
          <p className="truncate text-sm text-gray-500">{banner.link_url}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onEdit(banner)}
        className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        title="編集"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(banner.id)}
        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="削除"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function BannerForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel
}: {
  initialValues?: { title: string; link_url: string };
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
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          defaultValue={initialValues?.title ?? ""}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="バナータイトル"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">遷移先URL</label>
        <input
          type="text"
          name="link_url"
          defaultValue={initialValues?.link_url ?? ""}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          画像{!initialValues && <span className="text-red-500"> *</span>}
          {initialValues && <span className="text-gray-400 text-xs ml-1">（変更する場合のみ選択）</span>}
        </label>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
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

export default function BannersContent() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminTopPageBanners();
      if (res.error) throw new Error(res.error);
      setBanners(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(banners, oldIndex, newIndex);
    setBanners(newOrder);

    setIsReordering(true);
    setActionError(null);
    const res = await reorderTopPageBanners(newOrder.map((b) => b.id));
    setIsReordering(false);
    if (res.error) {
      setActionError(res.error);
      await fetchBanners();
    }
  };

  const handleCreate = async (formData: FormData) => {
    setActionError(null);
    const res = await createTopPageBanner(formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchBanners();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingBanner) return;
    setActionError(null);
    const res = await updateTopPageBanner(editingBanner.id, formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setEditingBanner(null);
    await fetchBanners();
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const res = await deleteTopPageBanner(id);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchBanners();
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">現在のバナー一覧</h2>
          {banners.length === 0 ? (
            <EmptyState
              title="バナーがありません"
              description="右のフォームからバナーを追加してください"
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={banners.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-3">
                  {banners.map((banner) => (
                    <React.Fragment key={banner.id}>
                      <SortableBannerItem
                        banner={banner}
                        onEdit={setEditingBanner}
                        onDelete={handleDelete}
                        isSortable={banners.length > 1}
                      />
                      {editingBanner?.id === banner.id && (
                        <li className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <p className="mb-3 text-sm font-medium text-blue-800">バナーを編集</p>
                          <BannerForm
                            initialValues={{
                              title: editingBanner.title,
                              link_url: editingBanner.link_url ?? ""
                            }}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingBanner(null)}
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">新規バナーを追加</h2>
          <BannerForm onSubmit={handleCreate} submitLabel="追加する" />
        </section>
      </div>
    </div>
  );
}
