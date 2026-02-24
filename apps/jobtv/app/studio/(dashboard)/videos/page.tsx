"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Plus, GripVertical } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/studio/molecules/PageHeader";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import EmptyState from "@/components/studio/atoms/EmptyState";
import VideoListItem from "@/components/studio/video/VideoListItem";
import VideoCategoryTabs from "@/components/studio/video/VideoCategoryTabs";
import VideoPreviewModal from "@/components/VideoPreviewModal";
import { useVideoManagement } from "@/hooks/useVideoManagement";
import { reorderVideosDraft, toggleVideoStatus, checkAndUpdateConversionStatus } from "@/lib/actions/video-actions";
import type { VideoCategory, VideoDraftItem } from "@/types/video.types";
import { VIDEO_CATEGORIES } from "@/types/video.types";

const VALID_TABS: VideoCategory[] = ["main", "short", "documentary"];

function tabFromSearchParams(searchParams: ReturnType<typeof useSearchParams>): VideoCategory {
  const tab = searchParams.get("tab");
  if (tab && VALID_TABS.includes(tab as VideoCategory)) return tab as VideoCategory;
  return "main";
}
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
  onPreview,
  onToggleStatus,
  isToggling,
  isSortable
}: {
  video: VideoDraftItem;
  onEdit: (id: string) => void;
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
  const searchParams = useSearchParams();
  const tabFromUrl = tabFromSearchParams(searchParams);
  const [activeCategory, setActiveCategory] = useState<VideoCategory>(tabFromUrl);
  const [sortedVideos, setSortedVideos] = useState<VideoDraftItem[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoDraftItem | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { videos, allVideos, isLoading, error, updateFilters, getCountByCategory, loadVideos } = useVideoManagement({
    autoLoad: true,
    category: tabFromUrl
  });
  const conversionCheckDoneRef = useRef(false);

  // 初回ロード後、未完了（processing/pending）の動画があれば1回だけ完了確認して一覧を再取得
  useEffect(() => {
    if (isLoading || conversionCheckDoneRef.current || allVideos.length === 0) return;
    const processingIds = allVideos
      .filter((v) => v.conversion_status === "processing" || v.conversion_status === "pending")
      .map((v) => v.id);
    if (processingIds.length === 0) return;
    conversionCheckDoneRef.current = true;
    (async () => {
      await Promise.all(processingIds.map((id) => checkAndUpdateConversionStatus(id)));
      await loadVideos();
    })();
  }, [allVideos, isLoading, loadVideos]);

  // URLのtabとactiveCategoryを同期（ブラウザバック等）
  useEffect(() => {
    setActiveCategory(tabFromUrl);
    updateFilters({ category: tabFromUrl });
  }, [tabFromUrl, updateFilters]);

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

  // カテゴリー変更（URLを更新）
  const handleCategoryChange = useCallback(
    (category: VideoCategory) => {
      setActiveCategory(category);
      updateFilters({ category });
      router.push(`/studio/videos?tab=${category}`);
    },
    [updateFilters, router]
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

  // 新規作成（現在のタブのカテゴリをクエリで渡す）
  const handleCreate = () => {
    router.push(`/studio/videos/new?category=${activeCategory}`);
  };

  // 編集
  const handleEdit = (id: string) => {
    router.push(`/studio/videos/${id}`);
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

  // 現在タブのカテゴリが上限かどうか（追加ボタン無効化用）
  const activeCategoryInfo = VIDEO_CATEGORIES.find((c) => c.id === activeCategory);
  const activeCount = getCountByCategory(activeCategory);
  const isAddDisabled = activeCategoryInfo?.maxCount != null && activeCount >= activeCategoryInfo.maxCount;

  // タブごとの追加ボタンラベル
  const addButtonLabel: Record<VideoCategory, string> = {
    main: "メインビデオを追加",
    short: "ショート動画を追加",
    documentary: "動画を追加"
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
          isAddDisabled ? (
            <span className="relative inline-block group">
              <StudioButton icon={<Plus className="w-4 h-4" />} disabled>
                {addButtonLabel[activeCategory]}
              </StudioButton>
              <span
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1.5 text-xs font-medium text-white bg-gray-800 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-none pointer-events-none z-10"
              >
                作成上限に達しています。既存の動画を編集してください。
              </span>
            </span>
          ) : (
            <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
              {addButtonLabel[activeCategory]}
            </StudioButton>
          )
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
        <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} />
      )}
    </div>
  );
}
