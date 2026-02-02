"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { uploadCompanyAsset } from "@/lib/actions/company-profile-actions";
import StudioButton from "../atoms/StudioButton";

interface StudioImageUploadProps {
  label: string;
  companyId: string;
  type: "logo" | "cover" | "message" | "video";
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
  aspectRatio?: "square" | "wide" | "auto";
  helperText?: string;
}

export default function StudioImageUpload({
  label,
  companyId,
  type,
  currentUrl,
  onUploadComplete,
  onError,
  aspectRatio = "auto",
  helperText
}: StudioImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      // ファイルタイプを判定
      const isVideoFile = type === "video" || file.type.startsWith("video/");
      setIsVideo(isVideoFile);

      // プレビュー用のURLを生成
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // アップロード開始
      setIsUploading(true);

      try {
        const result = await uploadCompanyAsset(file, companyId, type);

        if (result.error) {
          // エラー時はプレビューを元に戻す
          setPreviewUrl(currentUrl || null);
          onError?.(result.error);
        } else if (result.data) {
          // 成功時は新しいURLを設定
          setPreviewUrl(result.data);
          onUploadComplete(result.data);
        }
      } catch (error) {
        setPreviewUrl(currentUrl || null);
        onError?.(error instanceof Error ? error.message : "アップロードに失敗しました");
      } finally {
        setIsUploading(false);
        // プレビュー用のURLをクリーンアップ
        if (preview && preview !== currentUrl) {
          URL.revokeObjectURL(preview);
        }
      }
    },
    [companyId, type, currentUrl, onUploadComplete, onError]
  );

  // 初期化時にcurrentUrlが動画かどうかを判定
  useEffect(() => {
    if (currentUrl) {
      const isVideoUrl = type === "video" || !!currentUrl.match(/\.(mp4|webm|mov)$/i);
      setIsVideo(isVideoUrl);
    } else {
      setIsVideo(false);
    }
  }, [currentUrl, type]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadComplete("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "square":
        return "aspect-square";
      case "wide":
        return "aspect-[3/1]";
      default:
        return "aspect-auto";
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-700">{label}</label>

      <div
        className={`
          relative border-2 border-dashed rounded-xl overflow-hidden
          transition-all cursor-pointer
          ${isDragging ? "border-red-500 bg-red-50" : "border-gray-300 bg-gray-50"}
          ${isUploading ? "opacity-50 pointer-events-none" : "hover:border-gray-400"}
          ${getAspectRatioClass()}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <div className="relative w-full h-full">
            {isVideo ? (
              <video src={previewUrl} className="w-full h-full object-cover" controls={false} muted loop playsInline />
            ) : (
              <Image
                src={previewUrl}
                alt={label}
                fill
                className="object-cover"
                unoptimized={previewUrl.startsWith("blob:")}
              />
            )}
            {!isUploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-100 transition-colors"
                >
                  変更
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  削除
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            {isUploading ? (
              <>
                <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-gray-600">アップロード中...</p>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-sm font-bold text-gray-600 mb-1">
                  クリックまたはドラッグ&ドロップでファイルをアップロード
                </p>
                <p className="text-xs text-gray-500">JPEG, PNG, WebP, GIF, MP4, WebM (最大50MB)</p>
              </>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {helperText && <p className="text-[10px] text-gray-400">{helperText}</p>}
    </div>
  );
}
