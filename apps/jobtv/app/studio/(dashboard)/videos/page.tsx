"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Plus, GripVertical, X } from "lucide-react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/studio/molecules/PageHeader";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import EmptyState from "@/components/studio/atoms/EmptyState";
import VideoListItem from "@/components/studio/video/VideoListItem";
import VideoCategoryTabs from "@/components/studio/video/VideoCategoryTabs";
import { useVideoManagement } from "@/hooks/useVideoManagement";
import { reorderVideosDraft, toggleVideoStatus } from "@/lib/actions/video-actions";
import type { VideoCategory, VideoDraftItem } from "@/types/video.types";
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

// ソータブルなリストアイテムコンポーネント
function SortableVideoListItem({
  video,
  onEdit,
  onDelete,
  onPreview,
  onToggleStatus,
  isToggling,
  isSortable
}: {
  video: VideoDraftItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (video: VideoDraftItem) => void;
  onToggleStatus: (id: string, currentStatus: "active" | "closed") => void;
  isToggling: boolean;
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
    <div ref={setNodeRef} style={style}>
      <VideoListItem
        video={video}
        onEdit={onEdit}
        onDelete={onDelete}
        onPreview={onPreview}
        onToggleStatus={onToggleStatus}
        isToggling={isToggling}
        isSortable={isSortable}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export default function VideosPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<VideoCategory>("main");
  const [sortedVideos, setSortedVideos] = useState<VideoDraftItem[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoDraftItem | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { videos, allVideos, isLoading, error, deleteVideo, updateFilters, getCountByCategory, loadVideos } =
    useVideoManagement({ autoLoad: true, category: "main" });

  // センサーの設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // videosが更新されたらsortedVideosも更新
  useEffect(() => {
    setSortedVideos(videos);
  }, [videos]);

  // カテゴリー変更
  const handleCategoryChange = useCallback(
    (category: VideoCategory) => {
      setActiveCategory(category);
      updateFilters({ category });
    },
    [updateFilters]
  );

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedVideos.findIndex((v) => v.id === active.id);
      const newIndex = sortedVideos.findIndex((v) => v.id === over.id);

      const newSortedVideos = arrayMove(sortedVideos, oldIndex, newIndex);
      setSortedVideos(newSortedVideos);

      // サーバーに反映
      setIsReordering(true);
      const orders = newSortedVideos.map((video, index) => ({
        id: video.id,
        display_order: index
      }));

      const result = await reorderVideosDraft(orders);
      if (result.error) {
        alert(`並び替えの保存に失敗しました: ${result.error}`);
        // 失敗した場合は元の順序に戻す
        setSortedVideos(videos);
      }
      setIsReordering(false);
    }
  };

  // 並び替えが可能かどうか（動画が複数ある場合）
  const isSortable = sortedVideos.length > 1;

  // 新規作成
  const handleCreate = () => {
    router.push("/studio/videos/new");
  };

  // 編集
  const handleEdit = (id: string) => {
    router.push(`/studio/videos/${id}`);
  };

  // 削除
  const handleDelete = async (id: string) => {
    const result = await deleteVideo(id);
    if (result.success) {
      // 成功時は自動でリロードされる
    }
  };

  // プレビュー
  const handlePreview = (video: VideoDraftItem) => {
    setPreviewVideo(video);
  };

  // 公開・非公開切り替え
  const handleToggleStatus = async (id: string, currentStatus: "active" | "closed") => {
    // 既に更新中の場合は何もしない
    if (togglingIds.has(id)) return;

    const newStatus = currentStatus === "active" ? "closed" : "active";
    const statusText = newStatus === "active" ? "公開" : "非公開";

    if (!window.confirm(`公開設定を「${statusText}」に変更しますか？`)) {
      return;
    }

    // 更新中状態にする
    setTogglingIds((prev) => new Set(prev).add(id));

    try {
      const result = await toggleVideoStatus(id, newStatus);
      if (result.error) {
        alert(`ステータスの切り替えに失敗しました: ${result.error}`);
      } else {
        // 成功時はリロード
        await loadVideos();
      }
    } finally {
      // 更新中状態を解除
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // カテゴリー別カウント
  const categoryCounts = {
    main: getCountByCategory("main"),
    short: getCountByCategory("short"),
    documentary: getCountByCategory("documentary")
  };

  if (isLoading && allVideos.length === 0) {
    return (
      <div className="space-y-10">
        <PageHeader title="動画管理" description="企業紹介動画の管理・審査申請を行います" />
        <LoadingSpinner message="動画を読み込んでいます..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <PageHeader
        title="動画管理"
        description="企業紹介動画の管理・審査申請を行います"
        action={
          <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            新規動画を追加
          </StudioButton>
        }
      />

      {/* エラー表示 */}
      {error && <ErrorMessage message={error} className="animate-in fade-in slide-in-from-top-2 duration-300" />}

      {/* カテゴリータブ */}
      <VideoCategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        counts={categoryCounts}
      />

      {/* 並び替え中のローディング表示 */}
      {isReordering && (
        <div className="flex items-center justify-center py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100 animate-pulse">
          並び替えを保存中...
        </div>
      )}

      {/* 動画一覧 */}
      {sortedVideos.length === 0 ? (
        <EmptyState title="動画が登録されていません" description="「新規動画を追加」ボタンから動画を追加してください" />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedVideos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sortedVideos.map((video) => (
                <SortableVideoListItem
                  key={video.id}
                  video={video}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPreview={handlePreview}
                  onToggleStatus={handleToggleStatus}
                  isToggling={togglingIds.has(video.production_video_id || "")}
                  isSortable={isSortable}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* プレビューモーダル */}
      {previewVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewVideo(null)}
        >
          <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="bg-black rounded-lg overflow-hidden">
              <video src={previewVideo.video_url} controls autoPlay className="w-full" />
            </div>
            <div className="mt-4 text-white">
              <h3 className="text-lg font-bold">{previewVideo.title}</h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
