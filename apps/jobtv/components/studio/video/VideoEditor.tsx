"use client";

import React, { useState, useCallback } from "react";
import { Upload, Video as VideoIcon, Loader2, X } from "lucide-react";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import StudioLabel from "@/components/studio/atoms/StudioLabel";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioImageUpload from "@/components/studio/molecules/StudioImageUpload";
import { VIDEO_CATEGORIES } from "../../../types/video.types";
import type { VideoFormData, VideoCategory } from "../../../types/video.types";
import { TITLE_MAX_LENGTH } from "@/constants/validation";

interface VideoEditorProps {
  formData: VideoFormData;
  onChange: (data: VideoFormData) => void;
  onUploadVideo: (file: File, aspectRatio: "landscape" | "portrait") => Promise<{ success: boolean; url: string | null; error?: string }>;
  onUploadThumbnail: (file: File) => Promise<{ success: boolean; url: string | null; error?: string }>;
  readOnly?: boolean;
}

export default function VideoEditor({
  formData,
  onChange,
  onUploadVideo,
  onUploadThumbnail,
  readOnly = false
}: VideoEditorProps) {
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<"landscape" | "portrait">("landscape");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (field: keyof VideoFormData, value: string | number) => {
      const newData = { ...formData, [field]: value };
      onChange(newData);

      // エラーをクリア
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [formData, onChange, errors]
  );

  const handleVideoUpload = async (file: File) => {
    setIsUploadingVideo(true);
    try {
      const result = await onUploadVideo(file, aspectRatio);
      if (result.success && result.url) {
        onChange({ ...formData, video_url: result.url! });
      } else if (result.error) {
        setErrors((prev) => ({ ...prev, video_url: result.error! }));
      }
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleThumbnailUpload = async (url: string) => {
    onChange({ ...formData, thumbnail_url: url });
  };

  return (
    <div className="space-y-6">
      {/* カテゴリー選択 */}
      <div className="space-y-2">
        <StudioLabel htmlFor="category" required>
          カテゴリー
        </StudioLabel>
        <StudioSelect
          id="category"
          value={formData.category}
          onChange={(e) => handleChange("category", e.target.value as VideoCategory)}
          disabled={readOnly}
          required
        >
          <option value="">選択してください</option>
          {VIDEO_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
              {cat.description ? ` - ${cat.description}` : ""}
            </option>
          ))}
        </StudioSelect>
        <p className="text-[10px] text-gray-400">
          動画のカテゴリーを選択してください。メインビデオは1つまでしか登録できません。
        </p>
      </div>

      {/* タイトル */}
      <StudioFormField
        label="タイトル"
        name="title"
        type="text"
        required
        value={formData.title}
        onChange={(e) => handleChange("title", e.target.value)}
        placeholder="動画のタイトルを入れてください"
        error={errors.title}
        disabled={readOnly}
        maxLength={TITLE_MAX_LENGTH}
        showCharCount
      />

      {/* アスペクト比選択 */}
      <div className="space-y-2">
        <StudioLabel htmlFor="aspectRatio" required>
          動画の向き
        </StudioLabel>
        <StudioSelect
          id="aspectRatio"
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value as "landscape" | "portrait")}
          disabled={readOnly || isUploadingVideo || !!formData.video_url}
          required
        >
          <option value="landscape">横長（16:9）</option>
          <option value="portrait">縦長（9:16）</option>
        </StudioSelect>
        <p className="text-[10px] text-gray-400">
          動画のアスペクト比を選択してください。アップロード後は変更できません。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 動画アップロード */}
        <div className="space-y-3 flex flex-col">
          <StudioLabel htmlFor="video" required>
            動画ファイル
          </StudioLabel>

          <div className="flex-1">
            {formData.video_url ? (
              <div className="space-y-3 h-full flex flex-col">
                {/* 動画プレビュー */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video src={formData.video_url} controls className="w-full h-full object-contain" />
                </div>

                {/* 動画URL表示 */}
                <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-auto">
                  <p className="text-xs text-gray-600 truncate font-mono">{formData.video_url}</p>
                </div>

                {!readOnly && (
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file);
                      }}
                      className="hidden"
                      id="video-reupload"
                      disabled={isUploadingVideo}
                    />
                    <label
                      htmlFor="video-reupload"
                      className={`flex-1 px-4 py-2 text-sm font-bold text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer ${
                        isUploadingVideo ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {isUploadingVideo ? "アップロード中..." : "動画を変更"}
                    </label>
                    <button
                      type="button"
                      onClick={() => onChange({ ...formData, video_url: "" })}
                      className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative h-full">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoUpload(file);
                  }}
                  className="hidden"
                  id="video-upload"
                  disabled={isUploadingVideo || readOnly}
                />
                <label
                  htmlFor="video-upload"
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl aspect-video text-center cursor-pointer transition-all ${
                    isUploadingVideo || readOnly
                      ? "border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed"
                      : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {isUploadingVideo ? (
                    <div className="space-y-2">
                      <Loader2 className="w-10 h-10 text-gray-400 animate-spin mx-auto" />
                      <p className="text-sm text-gray-600 font-bold">アップロード中...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-bold text-gray-700 mb-1">動画をアップロード</p>
                      <p className="text-[10px] text-gray-500">MP4, WebM, MOV, AVI (最大50MB)</p>
                    </>
                  )}
                </label>
              </div>
            )}
          </div>
          {errors.video_url && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.video_url}</p>}
        </div>

        {/* サムネイルアップロード */}
        <div className="space-y-3 flex flex-col">
          <StudioImageUpload
            label="サムネイル画像（オプション）"
            type="cover"
            currentUrl={formData.thumbnail_url}
            onUploadComplete={handleThumbnailUpload}
            onUploadingChange={setIsUploadingThumbnail}
            aspectRatio="auto"
            helperText="16:9のアスペクト比を推奨。未設定の場合、動画の最初のフレームが使用されます。"
            disabled={readOnly}
            customUploadFunction={async (file: File) => {
              const result = await onUploadThumbnail(file);
              return { data: result.url, error: result.error || null };
            }}
          />
        </div>
      </div>
    </div>
  );
}
