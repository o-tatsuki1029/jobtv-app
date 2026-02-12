"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, Users, ImageIcon, Filter, ExternalLink } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import EmptyState from "@/components/studio/atoms/EmptyState";
import PageHeader from "@/components/studio/molecules/PageHeader";
import FilterSortSection from "@/components/studio/molecules/FilterSortSection";
import ApprovalActions from "@/components/admin/ApprovalActions";
import { getAllSessionsForReview, approveSession, rejectSession } from "@/lib/actions/admin-actions";
import type { Tables } from "@jobtv-app/shared/types";

type Session = Tables<"sessions">;

interface SessionWithCompany extends Session {
  companies?: {
    id: string;
    name: string;
  } | null;
}

export default function AdminSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithCompany[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("created_at_desc");

  // 説明会一覧を取得
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getAllSessionsForReview();
    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      return;
    }

    if (data) {
      setSessions(data as SessionWithCompany[]);
      setFilteredSessions(data as SessionWithCompany[]);
    }
    setLoading(false);
  };

  // ソートを適用
  useEffect(() => {
    let filtered = [...sessions];

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "title_asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title_desc":
          return (b.title || "").localeCompare(a.title || "");
        case "created_at_asc":
          return new Date(a.created_at || "").getTime() - new Date(b.created_at || "").getTime();
        case "created_at_desc":
        default:
          return new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime();
      }
    });

    setFilteredSessions(filtered);
  }, [sessions, sortBy]);

  const handleApprove = async (sessionId: string) => {
    return approveSession(sessionId);
  };

  const handleReject = async (sessionId: string) => {
    return rejectSession(sessionId);
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
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}

      <div>
        <h1 className="text-3xl font-black tracking-tight">説明会審査</h1>
        <p className="text-gray-500 font-medium">審査待ちの説明会を承認・却下します。</p>
      </div>

      {/* ソート */}
      {!loading && sessions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">ソート</span>
            </div>
            <div className="flex-1 min-w-[200px]">
              <StudioLabel>並び順</StudioLabel>
              <StudioSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="created_at_desc">作成日（新しい順）</option>
                <option value="created_at_asc">作成日（古い順）</option>
                <option value="title_asc">タイトル（あいうえお順）</option>
                <option value="title_desc">タイトル（逆順）</option>
              </StudioSelect>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500 font-medium">読み込み中...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 font-medium">審査待ちの説明会はありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 font-medium">条件に一致する説明会がありません</p>
            </div>
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
                        <StudioBadge variant="neutral">審査中</StudioBadge>
                        {session.companies && (
                          <span className="text-xs text-gray-500 font-medium">{session.companies.name}</span>
                        )}
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">{session.title}</h3>
                      {session.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{session.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4">
                      {locationText && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                          <MapPin className="w-4 h-4" />
                          {locationText}
                        </div>
                      )}
                      {session.capacity && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                          <Users className="w-4 h-4" />
                          定員: {session.capacity}名
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右側：アクションボタン */}
                  <div className="md:w-64 p-4 flex flex-col items-center justify-center gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
                    <ApprovalActions
                      onApprove={() => handleApprove(session.id)}
                      onReject={() => handleReject(session.id)}
                    />
                    <StudioButton
                      variant="outline"
                      size="sm"
                      fullWidth
                      icon={<ExternalLink className="w-3 h-3" />}
                      onClick={() => router.push(`/admin/sessions/${session.id}`)}
                    >
                      詳細を見る
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

