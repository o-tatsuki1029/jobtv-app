"use client";

import React from "react";
import Image from "next/image";
import { ImageIcon, ExternalLink } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import ApprovalActions from "@/components/admin/ApprovalActions";

interface ReviewVideoCardProps {
  video: any;
  onApprove: (draftId: string) => Promise<{ error: string | null }>;
  onReject: (draftId: string) => Promise<{ error: string | null }>;
}

export default function ReviewVideoCard({
  video,
  onApprove,
  onReject
}: ReviewVideoCardProps) {
  const categoryLabel = video.category === "main" ? "メインビデオ" : video.category === "short" ? "ショート動画" : "動画";
  const conversionStatus = video.conversion_status;
  const canApprove = conversionStatus === "completed";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:border-black/10">
      <div className="md:w-64 relative bg-red-50 border-b md:border-b-0 md:border-r border-red-100 overflow-hidden aspect-video min-h-[160px]">
        {video.thumbnail_url ? (
          <Image
            src={video.thumbnail_url}
            alt={video.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-red-400" />
          </div>
        )}
      </div>
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
                ⚠️ 動画を変換中です。変換完了後に承認してください。
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
              <p className="text-red-800 text-xs font-bold">❌ 動画の変換に失敗しました。</p>
            </div>
          )}
        </div>
      </div>
      <div className="md:w-64 p-6 flex flex-col items-stretch justify-center gap-3 bg-gray-50/50 border-t md:border-t-0 md:border-l border-gray-100">
        <StudioButton
          variant="outline"
          size="sm"
          icon={<ExternalLink className="w-3 h-3" />}
          className="w-full justify-center"
          onClick={() => window.open(video.video_url, "_blank")}
        >
          動画を確認
        </StudioButton>
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

