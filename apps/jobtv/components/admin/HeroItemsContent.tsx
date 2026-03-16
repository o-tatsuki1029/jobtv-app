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
  getAdminTopPageHeroItems,
  createTopPageHeroItem,
  updateTopPageHeroItem,
  deleteTopPageHeroItem,
  reorderTopPageHeroItems,
  getHeroVideoPresignedUrl,
  confirmHeroVideoUpload
} from "@/lib/actions/top-page-hero-actions";
import { useS3Upload } from "@/hooks/useS3Upload";

type HeroItem = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  auto_thumbnail_url: string | null;
  is_converted: boolean;
  mediaconvert_job_id: string | null;
  video_url: string | null;
  is_pr: boolean;
  link_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
};

function SortableHeroItem({
  item,
  onEdit,
  onDelete,
  isSortable
}: {
  item: HeroItem;
  onEdit: (item: HeroItem) => void;
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

  const thumbnailSrc = item.thumbnail_url ?? item.auto_thumbnail_url;

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
        {thumbnailSrc ? (
          <Image
            src={thumbnailSrc}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            No image
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {item.is_pr && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-bold text-white bg-red-500 rounded">PR</span>
          )}
          {!item.is_converted && (
            <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-bold text-white bg-yellow-500 rounded">変換中</span>
          )}
          <p className="truncate text-sm font-medium text-gray-800">{item.title}</p>
        </div>
        {item.link_url && (
          <p className="truncate text-xs text-gray-500 mt-0.5">{item.link_url}</p>
        )}
        {item.video_url && (
          <p className="truncate text-xs text-gray-400 mt-0.5">{item.video_url}</p>
        )}
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

function HeroItemForm({
  initialValues,
  heroItemId,
  onSubmit,
  onCancel,
  submitLabel
}: {
  initialValues?: {
    title: string;
    is_pr: boolean;
    link_url: string;
    video_url: string;
  };
  /** 編集時: 既存のheroItemId。新規作成時: 事前生成されたID */
  heroItemId: string;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [titleLength, setTitleLength] = useState(initialValues?.title.length ?? 0);
  const formRef = useRef<HTMLFormElement>(null);
  const { upload: s3Upload, progress: s3Progress } = useS3Upload();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitMessage(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const videoFile = formData.get("video_file");
      const videoSelected = videoFile instanceof File && videoFile.size > 0;

      if (videoSelected) {
        // Step 1: Presigned URL を取得
        setSubmitMessage("アップロードURLを取得中...");
        const presignedResult = await getHeroVideoPresignedUrl(
          videoFile.name,
          videoFile.type,
          videoFile.size,
          heroItemId
        );
        if (presignedResult.error || !presignedResult.data) {
          throw new Error(presignedResult.error || "URLの取得に失敗しました");
        }

        // Step 2: S3 に直接アップロード
        setSubmitMessage("動画をアップロード中...");
        const uploadResult = await s3Upload(presignedResult.data.presignedUrl, videoFile);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "アップロードに失敗しました");
        }

        // Step 3: 確認 → MediaConvert 起動
        setSubmitMessage("HLS変換ジョブを起動中...");
        const confirmResult = await confirmHeroVideoUpload(presignedResult.data.s3Key, heroItemId);
        if (confirmResult.error || !confirmResult.data) {
          throw new Error(confirmResult.error || "確認処理に失敗しました");
        }

        // FormData にアップロード結果を追加（video_file は除去）
        formData.delete("video_file");
        formData.set("video_url", confirmResult.data.videoUrl);
        if (confirmResult.data.jobId) {
          formData.set("mediaconvert_job_id", confirmResult.data.jobId);
        }
        if (confirmResult.data.autoThumbnailUrl) {
          formData.set("auto_thumbnail_url", confirmResult.data.autoThumbnailUrl);
        }
      } else {
        formData.delete("video_file");
      }

      // heroItemId をフォームデータに含める（サーバー側で使用）
      formData.set("hero_item_id", heroItemId);
      setSubmitMessage("保存中...");
      await onSubmit(formData);
      if (videoSelected) {
        setSubmitMessage("保存しました。動画変換が完了すると再生できるようになります。");
      }
      if (!initialValues) {
        formRef.current?.reset();
        setTitleLength(0);
        if (!videoSelected) setSubmitMessage(null);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
      setSubmitMessage(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      {formError && <ErrorMessage message={formError} />}
      {submitMessage && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
          {submitMessage}
          {s3Progress && s3Progress.percent < 100 && (
            <div className="mt-1.5">
              <div className="w-full bg-blue-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${s3Progress.percent}%` }}
                />
              </div>
              <p className="text-[10px] text-blue-500 mt-0.5">{s3Progress.percent}%</p>
            </div>
          )}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          タイトル <span className="text-red-500">*</span>
          <span className={`ml-2 text-xs ${titleLength > 32 ? "text-red-500" : "text-gray-400"}`}>
            {titleLength}/32
          </span>
        </label>
        <input
          type="text"
          name="title"
          defaultValue={initialValues?.title ?? ""}
          required
          maxLength={32}
          onChange={(e) => setTitleLength(e.target.value.length)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="動画タイトル"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          name="is_pr"
          id="is_pr"
          defaultChecked={initialValues?.is_pr ?? false}
          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
        />
        <label htmlFor="is_pr" className="text-sm font-medium text-gray-700">PRフラグ</label>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL <span className="text-red-500">*</span>
        </label>
        <input
          type="url"
          name="link_url"
          defaultValue={initialValues?.link_url ?? ""}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="https://example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          動画ファイル
          {!initialValues && <span className="text-red-500"> *</span>}
          {initialValues && <span className="text-gray-400 text-xs ml-1">（変更する場合のみ選択）</span>}
        </label>
        {initialValues?.video_url && (
          <p className="mb-1 truncate text-xs text-gray-400">現在: {initialValues.video_url}</p>
        )}
        <input
          type="file"
          name="video_file"
          accept="video/mp4,video/webm,video/quicktime"
          required={!initialValues}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        <p className="text-xs text-gray-400 mt-1">MP4 / WebM / MOV、500MB以下。アップロード後にHLS変換が始まります。</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          サムネイル
          <span className="text-gray-400 text-xs ml-1">（省略可・動画から自動生成）</span>
        </label>
        <input
          type="file"
          name="thumbnail_file"
          accept="image/jpeg,image/png,image/webp"
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        <p className="text-xs text-gray-400 mt-1">JPEG / PNG / WebP、5MB以下</p>
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

export default function HeroItemsContent() {
  const [items, setItems] = useState<HeroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [editingItem, setEditingItem] = useState<HeroItem | null>(null);
  const [newItemId, setNewItemId] = useState(() => crypto.randomUUID());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminTopPageHeroItems();
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

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(items, oldIndex, newIndex);
    setItems(newOrder);

    setIsReordering(true);
    setActionError(null);
    const res = await reorderTopPageHeroItems(newOrder.map((item) => item.id));
    setIsReordering(false);
    if (res.error) {
      setActionError(res.error);
      await fetchItems();
    }
  };

  const handleCreate = async (formData: FormData) => {
    setActionError(null);
    const res = await createTopPageHeroItem(formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setNewItemId(crypto.randomUUID());
    await fetchItems();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingItem) return;
    setActionError(null);
    const res = await updateTopPageHeroItem(editingItem.id, formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setEditingItem(null);
    await fetchItems();
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const res = await deleteTopPageHeroItem(id);
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">現在のヒーロー一覧</h2>
          {items.length === 0 ? (
            <EmptyState
              title="ヒーローアイテムがありません"
              description="右のフォームからアイテムを追加してください"
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-3">
                  {items.map((item) => (
                    <React.Fragment key={item.id}>
                      <SortableHeroItem
                        item={item}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                        isSortable={items.length > 1}
                      />
                      {editingItem?.id === item.id && (
                        <li className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <p className="mb-3 text-sm font-medium text-blue-800">ヒーローアイテムを編集</p>
                          <HeroItemForm
                            initialValues={{
                              title: editingItem.title,
                              is_pr: editingItem.is_pr,
                              link_url: editingItem.link_url ?? "",
                              video_url: editingItem.video_url ?? ""
                            }}
                            heroItemId={editingItem.id}
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">新規アイテムを追加</h2>
          <HeroItemForm heroItemId={newItemId} onSubmit={handleCreate} submitLabel="追加する" />
        </section>
      </div>
    </div>
  );
}
