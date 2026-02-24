"use client";

import React from "react";
import { Play, Edit2, Eye } from "lucide-react";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioButton from "@/components/studio/atoms/StudioButton";
import { DRAFT_STATUS_BADGES, VIDEO_CATEGORIES } from "../../../types/video.types";
import type { VideoDraftItem } from "../../../types/video.types";

interface VideoCardProps {
  video: VideoDraftItem;
  onEdit: (id: string) => void;
  onPreview?: (video: VideoDraftItem) => void;
}

export default function VideoCard({ video, onEdit, onPreview }: VideoCardProps) {
  const statusBadge = DRAFT_STATUS_BADGES[video.draft_status];
  const categoryInfo = VIDEO_CATEGORIES.find((c) => c.id === video.category);

  const canEdit = video.draft_status === "draft" || video.draft_status === "rejected";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
      {/* サムネイル/動画プレビュー */}
      <div 
        className="relative w-full aspect-video bg-gray-100 cursor-pointer"
        onClick={() => onPreview?.(video)}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {/* ホバーオーバーレイ */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-4">
            <Play className="w-8 h-8 text-black" />
          </div>
        </div>

        {/* カテゴリーバッジ */}
        <div className="absolute top-2 left-2">
          <span className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
            {categoryInfo?.label}
          </span>
        </div>

        {/* ステータスバッジ */}
        <div className="absolute top-2 right-2">
          <StudioBadge variant={statusBadge.variant}>
            {statusBadge.label}
          </StudioBadge>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="p-4 space-y-3">
        {/* タイトル */}
        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 min-h-[2.5rem]">
          {video.title}
        </h3>

        {/* メタ情報 */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>
            {new Date(video.created_at || "").toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            })}
          </span>
          {video.submitted_at && (
            <>
              <span>•</span>
              <span>申請: {new Date(video.submitted_at).toLocaleDateString("ja-JP")}</span>
            </>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {onPreview && (
            <StudioButton
              variant="ghost"
              size="sm"
              icon={<Eye className="w-4 h-4" />}
              onClick={() => onPreview(video)}
              className="flex-1"
            >
              プレビュー
            </StudioButton>
          )}
          
          {canEdit && (
            <StudioButton
              variant="ghost"
              size="sm"
              icon={<Edit2 className="w-4 h-4" />}
              onClick={() => onEdit(video.id)}
              className="flex-1"
            >
              編集
            </StudioButton>
          )}
        </div>
      </div>
    </div>
  );
}

