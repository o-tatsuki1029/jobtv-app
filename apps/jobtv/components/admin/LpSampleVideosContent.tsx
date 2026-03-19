"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, X, GripVertical, Pencil, Check, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
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
  reorderLpSampleVideos,
  getLpVideoPresignedUrl,
  confirmLpVideoUpload
} from "@/lib/actions/lp-sample-video-actions";
import { useS3Upload } from "@/hooks/useS3Upload";

type SampleVideo = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  hls_url: string | null;
  auto_thumbnail_url: string | null;
  conversion_status: string | null;
  conversion_job_id: string | null;
  s3_key: string | null;
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

/** 変換ステータスバッジ */
function ConversionStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  switch (status) {
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          変換中
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          配信可能
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          <AlertCircle className="h-3 w-3" />
          変換失敗
        </span>
      );
    default:
      return null;
  }
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
        {video.auto_thumbnail_url && video.conversion_status === "completed" ? (
          <img
            src={video.auto_thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={video.video_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
            {video.tag}
          </span>
          <span className="text-xs text-gray-400">{video.duration}</span>
          <ConversionStatusBadge status={video.conversion_status} />
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
  onSubmit: (formData: FormData, file: File | null) => Promise<void>;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress } = useS3Upload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const dur = await extractVideoDuration(file);
      if (durationRef.current) durationRef.current.value = dur;
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
      await onSubmit(formData, selectedFile ?? null);
      if (!initialValues) {
        formRef.current?.reset();
        setSelectedFile(null);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  const isProcessing = submitting || isUploading;

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
          動画ファイル（MP4・最大500MB）{!initialValues && <span className="text-red-500"> *</span>}
          {initialValues && <span className="text-gray-400 text-xs ml-1">（変更する場合のみ選択）</span>}
        </label>
        <input
          type="file"
          name="file"
          accept="video/mp4,video/quicktime"
          required={!initialValues}
          onChange={handleFileChange}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        <p className="mt-1 text-xs text-gray-400">S3にアップロード後、自動でHLSストリーミング変換されます</p>
      </div>
      {isUploading && progress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>S3にアップロード中...</span>
            <span>{progress.percent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}
      <input type="hidden" name="duration" ref={durationRef} defaultValue={initialValues?.duration ?? ""} />
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isProcessing}
          className="inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : initialValues ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isProcessing ? "処理中..." : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
  const { upload } = useS3Upload();

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

  // 変換中の動画がある場合、定期ポーリング
  useEffect(() => {
    const hasProcessing = videos.some((v) => v.conversion_status === "processing");
    if (!hasProcessing) return;
    const interval = setInterval(fetchVideos, 10000);
    return () => clearInterval(interval);
  }, [videos, fetchVideos]);

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

  /** S3アップロード → MediaConvert変換開始 → DB保存 */
  const uploadAndConvert = async (
    videoId: string,
    file: File
  ): Promise<{
    videoUrl: string;
    hlsUrl: string;
    s3Key: string;
    jobId: string;
    autoThumbnailUrl: string | null;
  }> => {
    // 1. Presigned URL を取得
    const presignedRes = await getLpVideoPresignedUrl(videoId, file.name, file.type, file.size);
    if (presignedRes.error || !presignedRes.data) {
      throw new Error(presignedRes.error || "Presigned URLの取得に失敗しました");
    }

    // 2. S3 に直接アップロード
    const uploadResult = await upload(presignedRes.data.presignedUrl, file);
    if (!uploadResult.success) {
      throw new Error(uploadResult.error || "S3アップロードに失敗しました");
    }

    // 3. MediaConvert 変換開始
    const confirmRes = await confirmLpVideoUpload(videoId, presignedRes.data.s3Key);
    if (confirmRes.error || !confirmRes.data) {
      throw new Error(confirmRes.error || "変換開始に失敗しました");
    }

    // CloudFront URL をvideo_urlとして使用
    const cloudFrontBase = confirmRes.data.hlsUrl.replace(/\/hls\/portrait\/original\.m3u8$/, "");
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const videoUrl = `${cloudFrontBase}/original.${ext}`;

    return {
      videoUrl,
      hlsUrl: confirmRes.data.hlsUrl,
      s3Key: presignedRes.data.s3Key,
      jobId: confirmRes.data.jobId,
      autoThumbnailUrl: confirmRes.data.autoThumbnailUrl
    };
  };

  const handleCreate = async (formData: FormData, file: File | null) => {
    setActionError(null);
    if (!file) {
      setActionError("動画ファイルを選択してください");
      return;
    }

    try {
      const videoId = crypto.randomUUID();

      const result = await uploadAndConvert(videoId, file);

      formData.set("id", videoId);
      formData.set("video_url", result.videoUrl);
      formData.set("hls_url", result.hlsUrl);
      formData.set("s3_key", result.s3Key);
      formData.set("conversion_job_id", result.jobId);
      if (result.autoThumbnailUrl) {
        formData.set("auto_thumbnail_url", result.autoThumbnailUrl);
      }
      formData.delete("file");

      const res = await createLpSampleVideo(formData);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      await fetchVideos();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  const handleUpdate = async (formData: FormData, file: File | null) => {
    if (!editingVideo) return;
    setActionError(null);

    try {
      if (file) {
        const result = await uploadAndConvert(editingVideo.id, file);
        formData.set("video_url", result.videoUrl);
        formData.set("hls_url", result.hlsUrl);
        formData.set("s3_key", result.s3Key);
        formData.set("conversion_job_id", result.jobId);
        if (result.autoThumbnailUrl) {
          formData.set("auto_thumbnail_url", result.autoThumbnailUrl);
        }
      }
      formData.delete("file");

      const res = await updateLpSampleVideo(editingVideo.id, formData);
      if (res.error) {
        setActionError(res.error);
        return;
      }
      setEditingVideo(null);
      await fetchVideos();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "エラーが発生しました");
    }
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
