"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  thumbnail?: string;
  aspectRatio?: "video" | "portrait";
}

export default function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  thumbnail,
  aspectRatio = "video"
}: VideoModalProps) {
  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* 背景オーバーレイ */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      {/* モーダルコンテンツ */}
      <div
        className={`relative w-full max-w-5xl mx-auto flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 md:-right-12 p-2 text-white hover:text-gray-300 transition-colors bg-white/10 hover:bg-white/20 rounded-full"
          aria-label="閉じる"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 動画プレイヤー */}
        <div
          className={`bg-black rounded-xl overflow-hidden shadow-2xl ${
            aspectRatio === "portrait" ? "aspect-[9/16] max-h-[80vh] mx-auto" : "aspect-video"
          }`}
        >
          <VideoPlayer src={videoUrl} poster={thumbnail} autoplay={true} className="w-full h-full" />
        </div>

        {/* タイトル */}
        <div className="text-white px-2">
          <h3 className="text-lg md:text-xl font-bold line-clamp-2">{title}</h3>
        </div>
      </div>
    </div>
  );
}
