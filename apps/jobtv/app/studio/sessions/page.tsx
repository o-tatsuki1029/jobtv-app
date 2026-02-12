"use client";

import React, { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, MapPin, ExternalLink, Users, ImageIcon, Filter, Clock } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import PageHeader from "@/components/studio/molecules/PageHeader";
import FilterSortSection from "@/components/studio/molecules/FilterSortSection";
import { getSessionDrafts, getSessionReservationCounts } from "@/lib/actions/session-actions";
import { useListPage } from "@/hooks/useListPage";
import type { Tables } from "@jobtv-app/shared/types";

// 型定義（DBスキーマに合わせる）
type SessionDraft = Tables<"sessions_draft">;

interface SessionWithCount extends Omit<SessionDraft, "draft_status"> {
  status: "draft" | "pending" | "active" | "closed";
  reservationCount: number;
}

export default function SessionsPage() {
  const router = useRouter();

  const loadSessions = useCallback(async () => {
    const { data, error: fetchError } = await getSessionDrafts();
    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (data) {
      // 予約数を取得（production_session_idがある場合のみ）
      const productionSessionIds = data
        .filter((draft) => draft.production_session_id)
        .map((draft) => draft.production_session_id!);
      
      const { data: counts } = productionSessionIds.length > 0
        ? await getSessionReservationCounts(productionSessionIds)
        : { data: {} };

      const sessionsWithCounts: SessionWithCount[] = data.map((draft) => ({
        ...draft,
        id: draft.id,
        status: draft.draft_status === "submitted" ? "pending" : draft.draft_status === "approved" ? "active" : draft.draft_status === "rejected" ? "closed" : "draft",
        reservationCount: draft.production_session_id ? (counts?.[draft.production_session_id] || 0) : 0
      }));

      return { data: sessionsWithCounts, error: null };
    }
    return { data: null, error: null };
  }, []);

  const {
    filteredItems: filteredSessions,
    loading,
    error,
    statusFilter,
    sortBy,
    setStatusFilter,
    setSortBy,
    setError
  } = useListPage<SessionWithCount>({
    loadData: loadSessions,
    statusMapper: (session) => session.status,
    sortOptions: [
      { value: "updated_at_desc", label: "更新日（新しい順）" },
      { value: "updated_at_asc", label: "更新日（古い順）" },
      { value: "event_date_desc", label: "開催日（新しい順）" },
      { value: "event_date_asc", label: "開催日（古い順）" },
      { value: "created_at_desc", label: "作成日（新しい順）" },
      { value: "created_at_asc", label: "作成日（古い順）" },
      { value: "title_asc", label: "タイトル（あいうえお順）" },
      { value: "title_desc", label: "タイトル（逆順）" }
    ],
    filterOptions: [
      { value: "all", label: "全て" },
      { value: "active", label: "公開中" },
      { value: "pending", label: "審査中" },
      { value: "closed", label: "終了" }
    ]
  });

  const handleEdit = (session: SessionWithCount) => {
    router.push(`/studio/sessions/${session.id}`);
  };

  const handleCreate = () => {
    router.push("/studio/sessions/new");
  };

  // 日付と時間をフォーマット（最初の日程を使用）
  const formatEventDateTime = (session: SessionWithCount) => {
    // 一覧ページでは最初の日程を表示（実際にはsession_datesから取得する必要があるが、今は簡易的に）
    return { month: "", day: "", weekday: "", time: "" };
  };

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
        title="説明会管理"
        description="説明会やイベントの情報を管理します。"
        action={
          <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleCreate}>
            新規説明会を作成
          </StudioButton>
        }
      />

      {/* フィルター・ソート */}
      {!loading && filteredSessions.length > 0 && (
        <FilterSortSection
          filters={[
            {
              label: "公開ステータス",
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "all", label: "全て" },
                { value: "active", label: "公開中" },
                { value: "pending", label: "審査中" },
                { value: "closed", label: "終了" }
              ]
            },
            {
              label: "並び順",
              value: sortBy,
              onChange: setSortBy,
              options: [
                { value: "updated_at_desc", label: "更新日（新しい順）" },
                { value: "updated_at_asc", label: "更新日（古い順）" },
                { value: "event_date_desc", label: "開催日（新しい順）" },
                { value: "event_date_asc", label: "開催日（古い順）" },
                { value: "created_at_desc", label: "作成日（新しい順）" },
                { value: "created_at_asc", label: "作成日（古い順）" },
                { value: "title_asc", label: "タイトル（あいうえお順）" },
                { value: "title_desc", label: "タイトル（逆順）" }
              ]
            }
          ]}
        />
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filteredSessions.length === 0 && statusFilter === "all" ? (
        <EmptyState
          title="説明会がまだ登録されていません"
          description="新規説明会を作成して始めましょう"
        />
      ) : (
        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <EmptyState title="条件に一致する説明会がありません" />
          ) : (
            filteredSessions.map((session) => {
              const locationText = getLocationText(session.location_type, session.location_detail);

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10"
                >
                  {/* 左側：カバー画像セクション */}
                  <div className="md:w-64 relative bg-gray-100 border-b md:border-b-0 md:border-r border-gray-100 overflow-hidden">
                    {session.cover_image_url ? (
                      <Image src={session.cover_image_url} alt={session.title} fill className="object-cover" />
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
                            session.status === "active" ? "success" : session.status === "pending" ? "neutral" : "neutral"
                          }
                        >
                          {session.status === "active" ? "公開中" : session.status === "pending" ? "審査中" : "終了"}
                        </StudioBadge>
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
                    <StudioButton size="sm" fullWidth onClick={() => router.push(`/studio/sessions/${session.id}/reservations`)}>
                      予約リストを確認
                    </StudioButton>
                    <StudioButton
                      variant="outline"
                      size="sm"
                      fullWidth
                      icon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => handleEdit(session)}
                    >
                      詳細編集
                    </StudioButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
