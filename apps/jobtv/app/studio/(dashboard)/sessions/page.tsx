"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, MapPin, ExternalLink, Users, ImageIcon, GripVertical } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import PageHeader from "@/components/studio/molecules/PageHeader";
import ListFilterSection from "@/components/studio/molecules/ListFilterSection";
import { getStudioSessionsPageData, reorderSessions } from "@/lib/actions/session-actions";
import { getCompanyCoverImageForStudio } from "@/lib/actions/company-profile-actions";
import { useListPage } from "@/hooks/useListPage";
import type { Tables } from "@jobtv-app/shared/types";
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

// 型定義（DBスキーマに合わせる）
type SessionDraft = Tables<"sessions_draft">;

interface SessionWithCount extends SessionDraft {
  status: "draft" | "active" | "closed";
  reservationCount: number;
}

// ソータブルなリストアイテムコンポーネント
function SortableSessionItem({
  session,
  onEdit,
  onReservations,
  isSortable,
  getLocationText,
  companyCoverImage,
  companyCoverLoading
}: {
  session: SessionWithCount;
  onEdit: (session: SessionWithCount) => void;
  onReservations: (session: SessionWithCount) => void;
  isSortable: boolean;
  getLocationText: (locationType: string | null, locationDetail: string | null) => string | null;
  companyCoverImage?: string | null;
  companyCoverLoading?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: session.id,
    disabled: !isSortable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1
  };

  const locationText = getLocationText(session.location_type, session.location_detail);
  const coverImage = session.cover_image_url || companyCoverImage;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
    >
      {/* ドラッグハンドル */}
      {isSortable && (
        <div
          {...attributes}
          {...listeners}
          className="hidden md:flex items-center justify-center w-10 bg-gray-50 border-r border-gray-100 cursor-grab active:cursor-grabbing"
          title="ドラッグして並び替え"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>
      )}

      {/* 左側：カバー画像セクション（読み込み中はスケルトンアニメーション） */}
      <div className="md:w-64 relative bg-gray-100 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden min-h-[140px] md:min-h-full">
        {coverImage ? (
          <Image src={coverImage} alt={session.title} fill className="object-cover" />
        ) : companyCoverLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse" aria-busy="true" aria-label="画像読み込み中">
            <div className="w-12 h-12 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* 中央：詳細情報 */}
      <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {session.type && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded">
                {session.type}
              </span>
            )}
            <StudioBadge
              variant={
                session.draft_status === "submitted" ? "neutral" : session.status === "active" ? "success" : "neutral"
              }
            >
              {session.draft_status === "submitted" ? "審査中" : session.status === "active" ? "公開中" : "終了"}
            </StudioBadge>
            {session.graduation_year && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                {session.graduation_year}年卒
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-gray-900">{session.title}</h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4">
          {locationText && (
            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
              <MapPin className="w-4 h-4" />
              {locationText}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Users className="w-4 h-4" />
            参加予約: <span className="text-black font-black">{session.reservationCount}</span>
            {session.capacity ? ` / ${session.capacity}名` : "名"}
          </div>
        </div>
      </div>

      {/* 右側：アクションボタン */}
      <div className="md:w-48 p-4 flex flex-col items-center justify-center gap-2 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
        <StudioButton size="sm" fullWidth onClick={() => onReservations(session)}>
          予約リストを確認
        </StudioButton>
        <StudioButton
          variant="outline"
          size="sm"
          fullWidth
          icon={<ExternalLink className="w-3 h-3" />}
          onClick={() => onEdit(session)}
        >
          詳細編集
        </StudioButton>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const router = useRouter();
  const [sortedSessions, setSortedSessions] = useState<SessionWithCount[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [companyCoverImage, setCompanyCoverImage] = useState<string | null>(null);
  const [companyCoverLoading, setCompanyCoverLoading] = useState(false);
  const coverRequestedRef = useRef(false);

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

  const loadSessions = useCallback(async (): Promise<{ data: SessionWithCount[] | null; error: string | null }> => {
    const { data, error } = await getStudioSessionsPageData();
    if (error) return { data: null, error };
    return { data: (data ?? null) as SessionWithCount[] | null, error: null };
  }, []);

  const {
    filteredItems: filteredSessions,
    loading,
    error,
    statusFilter,
    graduationYearFilter,
    availableGraduationYears,
    availableStatuses,
    setStatusFilter,
    setGraduationYearFilter,
    setError
  } = useListPage<SessionWithCount>({
    loadData: loadSessions,
    statusMapper: (session) => {
      // draft_statusがsubmittedの場合は"submitted"を返す
      if (session.draft_status === "submitted") {
        return "submitted";
      }
      return session.status;
    },
    graduationYearMapper: (session) => session.graduation_year,
    sortOptions: [],
    filterOptions: []
  });

  // 一覧表示後にカバー画像を遅延取得（読み込み中はスピナー表示）
  useEffect(() => {
    if (loading || coverRequestedRef.current) return;
    coverRequestedRef.current = true;
    setCompanyCoverLoading(true);
    getCompanyCoverImageForStudio()
      .then((r) => {
        if (r.data?.cover_image_url) setCompanyCoverImage(r.data.cover_image_url);
      })
      .finally(() => setCompanyCoverLoading(false));
  }, [loading]);

  // filteredSessionsが更新されたらsortedSessionsも更新
  useEffect(() => {
    setSortedSessions(filteredSessions);
  }, [filteredSessions]);

  const handleEdit = (session: SessionWithCount) => {
    router.push(`/studio/sessions/${session.id}`);
  };

  const handleReservations = (session: SessionWithCount) => {
    router.push(`/studio/candidates?sessionId=${session.production_session_id || session.id}`);
  };

  const handleCreate = () => {
    router.push("/studio/sessions/new");
  };

  // ドラッグ終了時の処理
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedSessions.findIndex((s) => s.id === active.id);
      const newIndex = sortedSessions.findIndex((s) => s.id === over.id);

      const newSortedSessions = arrayMove(sortedSessions, oldIndex, newIndex);
      setSortedSessions(newSortedSessions);

      // サーバーに反映
      setIsReordering(true);
      const orders = newSortedSessions.map((session, index) => ({
        id: session.id,
        display_order: index
      }));

      const result = await reorderSessions(orders);
      if (result.error) {
        alert(`並び替えの保存に失敗しました: ${result.error}`);
        // 失敗した場合は元の順序に戻す
        setSortedSessions(filteredSessions);
      }
      setIsReordering(false);
    }
  };

  // 並び替えが可能かどうか（公開済みの説明会が複数ある場合）
  const publishedSessions = sortedSessions.filter((s) => s.production_session_id);
  const isSortable = publishedSessions.length > 1;

  // 場所テキストを生成
  const getLocationText = (locationType: string | null, locationDetail: string | null) => {
    if (!locationType && !locationDetail) return null;
    if (locationType && locationDetail) {
      return `${locationType} / ${locationDetail}`;
    }
    return locationType || locationDetail || null;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <ErrorMessage message={error || ""} />

      <PageHeader
        title="説明会・インターン管理"
        description="説明会やインターンシップの情報を管理します。"
        action={
          <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            新規説明会を作成
          </StudioButton>
        }
      />

      {/* フィルター */}
      {!loading && filteredSessions.length > 0 && (
        <ListFilterSection
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          availableStatuses={availableStatuses}
          graduationYearFilter={graduationYearFilter}
          onGraduationYearFilterChange={setGraduationYearFilter}
          availableGraduationYears={availableGraduationYears}
        />
      )}

      {/* 並び替え中のローディング表示 */}
      {isReordering && (
        <div className="flex items-center justify-center py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100 animate-pulse">
          並び替えを保存中...
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : sortedSessions.length === 0 && statusFilter === "all" ? (
        <EmptyState title="説明会がまだ登録されていません" description="新規説明会を作成して始めましょう" />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedSessions.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {sortedSessions.length === 0 ? (
                <EmptyState title="条件に一致する説明会がありません" />
              ) : (
                sortedSessions.map((session) => (
                  <SortableSessionItem
                    key={session.id}
                    session={session}
                    onEdit={handleEdit}
                    onReservations={handleReservations}
                    isSortable={isSortable}
                    getLocationText={getLocationText}
                    companyCoverImage={companyCoverImage}
                    companyCoverLoading={companyCoverLoading}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
