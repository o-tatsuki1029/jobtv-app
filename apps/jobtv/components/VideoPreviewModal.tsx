"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import VideoPlayer from "./VideoPlayer";
import type { VideoCategory } from "@/types/video.types";

/** スタジオ・管理の動画プレビューモーダルで受け取る video の型 */
export interface VideoPreviewModalVideo {
  video_url: string;
  streaming_url?: string | null;
  conversion_status?: string | null;
  title: string;
  thumbnail_url?: string | null;
  auto_thumbnail_url?: string | null;
  /** ショート動画のとき portrait（9:16）で表示。未指定時は 16:9 */
  category?: VideoCategory;
}

interface VideoPreviewModalProps {
  video: VideoPreviewModalVideo;
  onClose: () => void;
}

export default function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  // 閉じる: ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const poster = video.thumbnail_url || video.auto_thumbnail_url || undefined;
  const streamingUrl = video.conversion_status === "completed" ? video.streaming_url ?? null : null;
  const src = video.video_url || video.streaming_url || "";
  const isPortrait = video.category === "short";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="動画プレビュー"
    >
      <div
        className="relative w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
          aria-label="閉じる"
        >
          <X className="w-6 h-6" />
        </button>
        <div
          className={`bg-black rounded-lg overflow-hidden ${
            isPortrait ? "aspect-[9/16] max-h-[80vh] mx-auto" : "aspect-video"
          }`}
        >
          <VideoPlayer
            src={src}
            streamingUrl={streamingUrl}
            poster={poster}
            controls
            autoplay
            loop={false}
            className="w-full h-full"
          />
        </div>
        <div className="mt-4 text-white">
          <h3 className="text-lg font-bold">{video.title}</h3>
        </div>
      </div>
    </div>
  );
}
