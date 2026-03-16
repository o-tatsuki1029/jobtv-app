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
  getAdminLpSampleVideos,
  createLpSampleVideo,
  updateLpSampleVideo,
  deleteLpSampleVideo,
  reorderLpSampleVideos
} from "@/lib/actions/lp-sample-video-actions";

type SampleVideo = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  tag: string;
  title: string;
  description: string;
  duration: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

/** 動画ファイルから再生時間を取得し mm:ss 形式で返す */
function extractVideoDuration(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const totalSec = Math.round(video.duration);
      const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const sec = String(totalSec % 60).padStart(2, "0");
      resolve(`${min}:${sec}`);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("動画の読み込みに失敗しました"));
    };
  });
}

/** 動画ファイルの先頭フレームを JPEG Blob として返す */
function captureVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas の取得に失敗しました"));
        return;
      }
      ctx.drawImage(video, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("サムネイルの生成に失敗しました"));
        },
        "image/jpeg",
        0.85
      );
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("動画の読み込みに失敗しました"));
    };
  });
}

function SortableVideoItem({
  video,
  onEdit,
  onDelete,
  isSortable
}: {
  video: SampleVideo;
  onEdit: (video: SampleVideo) => void;
  onDelete: (id: string) => void;
  isSortable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: video.id,
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
      <div className="relative h-20 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        <video
          src={video.video_url}
          className="w-full h-full object-cover"
          muted
          playsInline
          preload="metadata"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
            {video.tag}
          </span>
          <span className="text-xs text-gray-400">{video.duration}</span>
        </div>
        <p className="truncate font-medium text-gray-900">{video.title}</p>
        <p className="truncate text-sm text-gray-500">{video.description}</p>
      </div>
      <button
        type="button"
        onClick={() => onEdit(video)}
        className="rounded p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
        title="編集"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(video.id)}
        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="削除"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function VideoForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel
}: {
  initialValues?: { tag: string; title: string; description: string; duration?: string };
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const [dur, thumb] = await Promise.all([
        extractVideoDuration(file),
        captureVideoThumbnail(file)
      ]);
      if (durationRef.current) durationRef.current.value = dur;
      setThumbnailBlob(thumb);
      setThumbnailPreview(URL.createObjectURL(thumb));
    } catch {
      // 自動取得失敗時は既存値を維持
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      if (thumbnailBlob) {
        formData.set("thumbnail", new File([thumbnailBlob], "thumbnail.jpg", { type: "image/jpeg" }));
      }
      await onSubmit(formData);
      if (!initialValues) {
        formRef.current?.reset();
        setThumbnailBlob(null);
        setThumbnailPreview(null);
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
          タグ <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="tag"
          defaultValue={initialValues?.tag ?? ""}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="企業説明"
        />
      </div>
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
          placeholder="企業研究動画"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          説明 <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          defaultValue={initialValues?.description ?? ""}
          required
          rows={2}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="動画の説明文"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          動画ファイル（MP4）{!initialValues && <span className="text-red-500"> *</span>}
          {initialValues && <span className="text-gray-400 text-xs ml-1">（変更する場合のみ選択）</span>}
        </label>
        <input
          type="file"
          name="file"
          accept="video/mp4"
          required={!initialValues}
          onChange={handleFileChange}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
      </div>
      {thumbnailPreview && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">サムネイル（自動生成）</label>
          <img src={thumbnailPreview} alt="サムネイルプレビュー" className="h-24 rounded border border-gray-200 object-cover" />
        </div>
      )}
      <input type="hidden" name="duration" ref={durationRef} defaultValue={initialValues?.duration ?? ""} />
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

export default function LpSampleVideosContent() {
  const [videos, setVideos] = useState<SampleVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [editingVideo, setEditingVideo] = useState<SampleVideo | null>(null);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminLpSampleVideos();
      if (res.error) throw new Error(res.error);
      setVideos(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = videos.findIndex((v) => v.id === active.id);
    const newIndex = videos.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(videos, oldIndex, newIndex);
    setVideos(newOrder);

    setIsReordering(true);
    setActionError(null);
    const res = await reorderLpSampleVideos(newOrder.map((v) => v.id));
    setIsReordering(false);
    if (res.error) {
      setActionError(res.error);
      await fetchVideos();
    }
  };

  const handleCreate = async (formData: FormData) => {
    setActionError(null);
    const res = await createLpSampleVideo(formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchVideos();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingVideo) return;
    setActionError(null);
    const res = await updateLpSampleVideo(editingVideo.id, formData);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    setEditingVideo(null);
    await fetchVideos();
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    const res = await deleteLpSampleVideo(id);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchVideos();
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">現在のサンプル動画</h2>
          {videos.length === 0 ? (
            <EmptyState
              title="サンプル動画がありません"
              description="右のフォームから動画を追加してください"
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={videos.map((v) => v.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-3">
                  {videos.map((video) => (
                    <React.Fragment key={video.id}>
                      <SortableVideoItem
                        video={video}
                        onEdit={setEditingVideo}
                        onDelete={handleDelete}
                        isSortable={videos.length > 1}
                      />
                      {editingVideo?.id === video.id && (
                        <li className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <p className="mb-3 text-sm font-medium text-blue-800">動画を編集</p>
                          <VideoForm
                            initialValues={{
                              tag: editingVideo.tag,
                              title: editingVideo.title,
                              description: editingVideo.description,
                              duration: editingVideo.duration
                            }}
                            onSubmit={handleUpdate}
                            onCancel={() => setEditingVideo(null)}
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
          <h2 className="mb-4 text-lg font-semibold text-gray-900">新規サンプル動画を追加</h2>
          <VideoForm onSubmit={handleCreate} submitLabel="追加する" />
        </section>
      </div>
    </div>
  );
}
