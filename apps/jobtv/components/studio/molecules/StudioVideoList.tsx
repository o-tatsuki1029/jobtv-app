"use client";

import React, { useState } from "react";
import { Plus, X, Trash2, Video as VideoIcon } from "lucide-react";
import StudioButton from "../atoms/StudioButton";
import StudioVideoSelectModal, { type VideoItem } from "./StudioVideoSelectModal";

interface StudioVideoListProps {
  label: string;
  videos: VideoItem[];
  onChange: (videos: VideoItem[]) => void;
  onError?: (error: string) => void;
  maxSelection?: number; // 最大選択数（メインビデオの場合は1）
}

export default function StudioVideoList({ label, videos, onChange, onError, maxSelection }: StudioVideoListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRemoveVideo = (id: string) => {
    onChange(videos.filter((v) => v.id !== id));
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-gray-700">{label}</label>
          <StudioButton
            variant="outline"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
            className="text-xs"
          >
            動画を追加
          </StudioButton>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">動画が登録されていません</p>
            <p className="text-xs text-gray-400 mt-1">「動画を追加」ボタンから動画を追加してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {videos.map((video, index) => (
              <div key={video.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {video.thumbnail ? (
                      <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden">
                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-24 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <VideoIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-gray-700 mb-1">{video.title || "タイトルなし"}</h4>
                    {video.video && (
                      <p className="text-xs text-gray-500 truncate">{video.video}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveVideo(video.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                    aria-label="削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <StudioVideoSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        label={label}
        currentVideos={videos}
        onSelect={onChange}
        onError={onError}
        maxSelection={maxSelection}
      />
    </>
  );
}
