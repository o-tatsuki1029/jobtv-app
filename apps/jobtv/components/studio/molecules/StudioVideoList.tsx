"use client";

import React, { useState } from "react";
import { Plus, X, Trash2, Video as VideoIcon } from "lucide-react";
import StudioButton from "../atoms/StudioButton";
import StudioFormField from "./StudioFormField";
import StudioImageUpload from "./StudioImageUpload";
import { uploadCompanyAsset } from "@/lib/actions/company-profile-actions";

interface VideoItem {
  id: string;
  title: string;
  video: string;
  thumbnail?: string;
}

interface StudioVideoListProps {
  label: string;
  companyId: string;
  videos: VideoItem[];
  onChange: (videos: VideoItem[]) => void;
  onError?: (error: string) => void;
}

export default function StudioVideoList({ label, companyId, videos, onChange, onError }: StudioVideoListProps) {
  const [uploadingVideoId, setUploadingVideoId] = useState<string | null>(null);

  const handleAddVideo = () => {
    const newVideo: VideoItem = {
      id: crypto.randomUUID(),
      title: "",
      video: "",
      thumbnail: undefined
    };
    onChange([...videos, newVideo]);
  };

  const handleRemoveVideo = (id: string) => {
    onChange(videos.filter((v) => v.id !== id));
  };

  const handleVideoChange = (id: string, field: "title" | "video" | "thumbnail", value: string) => {
    onChange(
      videos.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleVideoUpload = async (id: string, file: File) => {
    setUploadingVideoId(id);
    try {
      const result = await uploadCompanyAsset(file, companyId, "video");
      if (result.error) {
        onError?.(result.error);
      } else if (result.data) {
        handleVideoChange(id, "video", result.data);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "動画のアップロードに失敗しました");
    } finally {
      setUploadingVideoId(null);
    }
  };

  const handleThumbnailUpload = async (id: string, file: File) => {
    try {
      const result = await uploadCompanyAsset(file, companyId, "cover");
      if (result.error) {
        onError?.(result.error);
      } else if (result.data) {
        handleVideoChange(id, "thumbnail", result.data);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "サムネイルのアップロードに失敗しました");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-bold text-gray-700">{label}</label>
        <StudioButton
          variant="outline"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleAddVideo}
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
        <div className="space-y-6">
          {videos.map((video, index) => (
            <div key={video.id} className="border border-gray-200 rounded-lg p-6 bg-white">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm text-gray-700">動画 {index + 1}</h4>
                <button
                  onClick={() => handleRemoveVideo(video.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  aria-label="削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <StudioFormField
                  label="タイトル"
                  name={`video-${video.id}-title`}
                  value={video.title}
                  onChange={(e) => handleVideoChange(video.id, "title", e.target.value)}
                  placeholder="例: 社員の1日 - エンジニア編"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">動画ファイル</label>
                  <div className="flex items-center gap-4">
                    {video.video ? (
                      <div className="flex-1">
                        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                          <p className="text-xs text-gray-600 truncate">{video.video}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleVideoUpload(video.id, file);
                            }
                          }}
                          className="hidden"
                          id={`video-upload-${video.id}`}
                          disabled={uploadingVideoId === video.id}
                        />
                        <label
                          htmlFor={`video-upload-${video.id}`}
                          className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                            uploadingVideoId === video.id
                              ? "border-gray-300 bg-gray-50 opacity-50"
                              : "border-gray-300 bg-gray-50 hover:border-gray-400"
                          }`}
                        >
                          {uploadingVideoId === video.id ? (
                            <p className="text-sm text-gray-600">アップロード中...</p>
                          ) : (
                            <>
                              <VideoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm font-bold text-gray-600">動画をアップロード</p>
                              <p className="text-xs text-gray-400 mt-1">MP4, WebM (最大50MB)</p>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                    {video.video && (
                      <button
                        onClick={() => {
                          document.getElementById(`video-upload-${video.id}`)?.click();
                        }}
                        className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        disabled={uploadingVideoId === video.id}
                      >
                        変更
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-gray-700">サムネイル画像（オプション）</label>
                  <StudioImageUpload
                    label=""
                    companyId={companyId}
                    type="cover"
                    currentUrl={video.thumbnail}
                    onUploadComplete={(url) => handleVideoChange(video.id, "thumbnail", url)}
                    onError={(error) => onError?.(error)}
                    aspectRatio="wide"
                    helperText="16:9のアスペクト比を推奨"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

