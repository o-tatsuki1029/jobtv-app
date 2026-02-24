"use client";

import React from "react";
import Image from "next/image";
import { ImageIcon, ExternalLink, Play } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ApprovalActions from "@/components/admin/ApprovalActions";

interface ReviewVideoCardProps {
  video: any;
  onApprove: (draftId: string) => Promise<{ error: string | null }>;
  onReject: (draftId: string) => Promise<{ error: string | null }>;
  onPreview?: (video: any) => void;
}

export default function ReviewVideoCard({
  video,
  onApprove,
  onReject,
  onPreview
}: ReviewVideoCardProps) {
  const categoryLabel = video.category === "main" ? "メインビデオ" : video.category === "short" ? "ショート動画" : "動画";
  const conversionStatus = video.conversion_status;
  // 変換完了時のみ承認可能
  const canApprove = conversionStatus === "completed";

  // 「動画を確認」・プレビュー：完了済みはstreaming_url、それ以外はvideo_url
  const videoPreviewUrl = video.streaming_url || video.video_url;

  const displayThumbnail = video.thumbnail_url || video.auto_thumbnail_url || null;
  const handleOpenPreview = () => videoPreviewUrl && onPreview?.(video);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10">
      <button
        type="button"
        className="group md:w-64 relative bg-red-50 border-b md:border-b-0 md:border-r border-red-100 overflow-hidden aspect-video min-h-[160px] block w-full text-left focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-inset cursor-pointer disabled:cursor-default disabled:opacity-70"
        onClick={handleOpenPreview}
        disabled={!videoPreviewUrl}
      >
        {displayThumbnail ? (
          <Image
            src={displayThumbnail}
            alt={video.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-red-400" />
          </div>
        )}
        {videoPreviewUrl && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="rounded-full bg-white/90 p-3">
              <Play className="w-8 h-8 text-gray-900 fill-gray-900" />
            </div>
          </div>
        )}
      </button>
      <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
              {categoryLabel}
            </span>
            <StudioBadge variant="neutral">審査中</StudioBadge>
            {video.company_name && (
              <span className="text-xs text-gray-500 font-medium">
                {video.company_name}
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">{video.title}</h3>

          {/* 変換ステータス表示 */}
          {conversionStatus === "processing" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
              <p className="text-yellow-800 text-xs font-bold">
                ⚠️ 動画を変換中です。変換完了後に承認できます。
              </p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-yellow-200 overflow-hidden">
                <div className="h-full rounded-full bg-yellow-500 animate-pulse w-full" />
              </div>
            </div>
          )}
          {(conversionStatus === "pending" || !conversionStatus) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-2">
              <p className="text-gray-700 text-xs font-bold">
                変換待機中です。変換完了後に承認できます。
              </p>
            </div>
          )}
          {conversionStatus === "completed" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <p className="text-green-800 text-xs font-bold">✓ 動画の変換が完了しています。承認可能です。</p>
            </div>
          )}
          {conversionStatus === "failed" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
              <p className="text-red-800 text-xs font-bold">❌ 動画の変換に失敗しました。企業に再アップロードを依頼してください。</p>
            </div>
          )}
        </div>
      </div>
      <div className="md:w-64 p-6 flex flex-col items-stretch justify-center gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
        {videoPreviewUrl && (
          <StudioButton
            variant="outline"
            size="sm"
            icon={<ExternalLink className="w-3 h-3" />}
            className="w-full justify-center"
            onClick={handleOpenPreview}
          >
            動画を確認
          </StudioButton>
        )}
        <ApprovalActions
          onApprove={() => onApprove(video.id)}
          onReject={() => onReject(video.id)}
          vertical
          approveDisabled={!canApprove}
        />
      </div>
    </div>
  );
}

