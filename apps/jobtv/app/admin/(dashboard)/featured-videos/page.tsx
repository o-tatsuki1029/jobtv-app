"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Tabs from "@/components/studio/molecules/Tabs";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import EmptyState from "@/components/studio/atoms/EmptyState";
import {
  getEligibleVideosForTopPage,
  getFeaturedVideosForTopPage,
  addFeaturedVideoForTopPage,
  removeFeaturedVideoForTopPage,
  reorderFeaturedVideosForTopPage
} from "@/lib/actions/top-page-featured-actions";
import type { TopPageVideoKind } from "@/lib/actions/video-actions";
import type { Video } from "@/types/video.types";
import { Plus, X, GripVertical } from "lucide-react";
import Image from "next/image";
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

type TabKind = TopPageVideoKind;

interface VideoWithCompany extends Video {
  company_name: string | null;
  display_order?: number;
}

const TAB_OPTIONS: { id: TabKind; label: string }[] = [
  { id: "short", label: "就活Shorts" },
  { id: "documentary", label: "就活ドキュメンタリー" }
];

function SortableFeaturedItem({
  video,
  onRemove,
  isSortable
}: {
  video: VideoWithCompany;
  onRemove: (id: string) => void;
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
      <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-100">
        {(video.thumbnail_url || video.auto_thumbnail_url) ? (
          <Image
            src={video.thumbnail_url || video.auto_thumbnail_url || ""}
            alt=""
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            画像なし
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{video.title}</p>
        <p className="truncate text-sm text-gray-500">{video.company_name ?? "—"}</p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(video.id)}
        className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        title="トップから外す"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

export default function FeaturedVideosPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = (searchParams.get("tab") as TabKind) || "short";
  const [activeTab, setActiveTab] = useState<TabKind>(tabFromUrl);

  const [featuredShort, setFeaturedShort] = useState<VideoWithCompany[]>([]);
  const [featuredDoc, setFeaturedDoc] = useState<VideoWithCompany[]>([]);
  const [eligibleShort, setEligibleShort] = useState<VideoWithCompany[]>([]);
  const [eligibleDoc, setEligibleDoc] = useState<VideoWithCompany[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sortedFeatured, setSortedFeatured] = useState<VideoWithCompany[]>([]);
  const [isReordering, setIsReordering] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const [fs, fd, es, ed] = await Promise.all([
        getFeaturedVideosForTopPage("short"),
        getFeaturedVideosForTopPage("documentary"),
        getEligibleVideosForTopPage("short"),
        getEligibleVideosForTopPage("documentary")
      ]);
      if (fs.error) throw new Error(fs.error);
      if (fd.error) throw new Error(fd.error);
      if (es.error) throw new Error(es.error);
      if (ed.error) throw new Error(ed.error);
      setFeaturedShort(fs.data ?? []);
      setFeaturedDoc(fd.data ?? []);
      setEligibleShort(es.data ?? []);
      setEligibleDoc(ed.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const currentFeatured = activeTab === "short" ? featuredShort : featuredDoc;

  useEffect(() => {
    setSortedFeatured(activeTab === "short" ? featuredShort : featuredDoc);
  }, [activeTab, featuredShort, featuredDoc]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedFeatured.findIndex((v) => v.id === active.id);
    const newIndex = sortedFeatured.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(sortedFeatured, oldIndex, newIndex);
    setSortedFeatured(newOrder);

    setIsReordering(true);
    setActionError(null);
    const res = await reorderFeaturedVideosForTopPage(
      activeTab,
      newOrder.map((v) => v.id)
    );
    setIsReordering(false);
    if (res.error) {
      setActionError(res.error);
      setSortedFeatured(currentFeatured);
      return;
    }
    await fetchAll();
  };

  const featuredIds = new Set([
    ...featuredShort.map((v) => v.id),
    ...featuredDoc.map((v) => v.id)
  ]);
  const eligibleToAdd =
    activeTab === "short"
      ? eligibleShort.filter((v) => !featuredIds.has(v.id))
      : eligibleDoc.filter((v) => !featuredIds.has(v.id));

  const handleAdd = async (videoId: string) => {
    setActionError(null);
    const res = await addFeaturedVideoForTopPage(videoId, activeTab);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchAll();
  };

  const handleRemove = async (videoId: string) => {
    setActionError(null);
    const res = await removeFeaturedVideoForTopPage(videoId, activeTab);
    if (res.error) {
      setActionError(res.error);
      return;
    }
    await fetchAll();
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as TabKind);
    setActionError(null);
  };

  if (loading) {
    return <LoadingSpinner message="読み込み中..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">トップ掲載</h1>
        <p className="mt-1 text-sm text-gray-500">
          トップページの「就活Shorts」「就活ドキュメンタリー」に表示する動画を選択・並び替えできます。選択した動画のみがトップに表示されます。
        </p>
      </div>

      {error && <ErrorMessage message={error} />}
      {actionError && <ErrorMessage message={actionError} />}

      <Tabs
        tabs={TAB_OPTIONS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {isReordering && (
        <div className="flex items-center justify-center py-2 rounded-lg border border-blue-100 bg-blue-50 text-blue-600 text-xs font-bold animate-pulse">
          並び替えを保存中...
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            現在トップに表示している動画
          </h2>
          {sortedFeatured.length === 0 ? (
            <EmptyState
              title="まだ動画が選択されていません"
              description="右の候補から「トップに追加」で追加してください"
            />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedFeatured.map((v) => v.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-3">
                  {sortedFeatured.map((video) => (
                    <SortableFeaturedItem
                      key={video.id}
                      video={video}
                      onRemove={handleRemove}
                      isSortable={sortedFeatured.length > 1}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            トップに追加できる動画
          </h2>
          {eligibleToAdd.length === 0 ? (
            <EmptyState
              title="追加できる動画がありません"
              description="該当カテゴリの公開動画がすべて登録済みか、候補がありません"
            />
          ) : (
            <ul className="max-h-[480px] space-y-2 overflow-y-auto">
              {eligibleToAdd.map((video) => (
                <li
                  key={video.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                >
                  <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                    {(video.thumbnail_url || video.auto_thumbnail_url) ? (
                      <Image
                        src={video.thumbnail_url || video.auto_thumbnail_url || ""}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        画像なし
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{video.title}</p>
                    <p className="truncate text-sm text-gray-500">
                      {video.company_name ?? "—"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAdd(video.id)}
                    className="inline-flex items-center gap-1 rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4" />
                    トップに追加
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
