"use client";

import React from "react";
import { Play, Edit2, GripVertical, Loader2 } from "lucide-react";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import { DRAFT_STATUS_BADGES, VIDEO_CATEGORIES } from "../../../types/video.types";
import type { VideoDraftItem } from "../../../types/video.types";

interface VideoListItemProps {
  video: VideoDraftItem;
  onEdit: (id: string) => void;
  onPreview?: (video: VideoDraftItem) => void;
  onToggleStatus?: (id: string, currentStatus: "active" | "closed") => void;
  isToggling?: boolean;
  isSortable?: boolean;
  dragHandleProps?: any;
}

export default function VideoListItem({
  video,
  onEdit,
  onPreview,
  onToggleStatus,
  isToggling = false,
  isSortable,
  dragHandleProps
}: VideoListItemProps) {
  const statusBadge = DRAFT_STATUS_BADGES[video.draft_status];
  const categoryInfo = VIDEO_CATEGORIES.find((c) => c.id === video.category);
  const displayThumbnail = video.thumbnail_url || video.auto_thumbnail_url || null;

  const hasProduction = !!video.production_video_id;

  // 更新中の場合はステータスを反転させて表示（トグルを先に動かすため）
  const currentStatus = video.status || "closed";
  const displayStatus = isToggling 
    ? (currentStatus === "active" ? "closed" : "active") 
    : currentStatus;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex items-center p-4 gap-4">
      {/* ドラッグハンドル */}
      {isSortable && (
        <div 
          {...dragHandleProps}
          className="p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          title="ドラッグして並び替え"
        >
          <GripVertical className="w-5 h-5" />
        </div>
      )}

      {/* サムネイル（手動アップロード or 自動生成） */}
      <div 
        className="relative w-32 aspect-video bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
        onClick={() => onPreview?.(video)}
      >
        {displayThumbnail ? (
          <img
            src={displayThumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
            {categoryInfo?.label}
          </span>
          <StudioBadge variant={statusBadge.variant}>
            {statusBadge.label}
          </StudioBadge>
        </div>
        <h3 className="font-bold text-sm text-gray-900 truncate">
          {video.title}
        </h3>
        <p className="text-[10px] text-gray-500 mt-1">
          作成日: {new Date(video.created_at || "").toLocaleDateString("ja-JP")}
        </p>
      </div>

      {/* 公開・非公開トグル */}
      {hasProduction && (
        <div className="flex items-center gap-2 px-4 border-l border-r border-gray-100">
          <div className="relative">
            <button
              onClick={() => !isToggling && onToggleStatus?.(video.production_video_id!, currentStatus)}
              className={`
                relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none
                ${displayStatus === "active" ? "bg-green-500" : "bg-gray-300"}
                ${isToggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
              `}
              disabled={isToggling}
            >
              <span
                className={`
                  inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out
                  ${displayStatus === "active" ? "translate-x-5" : "translate-x-1"}
                `}
              />
            </button>
            {isToggling && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              </div>
            )}
          </div>
          <span className={`text-[10px] font-bold w-8 ${displayStatus === "active" ? "text-green-600" : "text-gray-400"}`}>
            {isToggling ? "更新中" : displayStatus === "active" ? "公開中" : "非公開"}
          </span>
        </div>
      )}

      {/* アクション */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(video.id)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          title="編集"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

