"use client";

import { useEffect, useState } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

/** スタジオ・管理の動画プレビューモーダルで受け取る video の型 */
export interface VideoPreviewModalVideo {
  video_url: string;
  streaming_url?: string | null;
  conversion_status?: string | null;
  title: string;
  thumbnail_url?: string | null;
  auto_thumbnail_url?: string | null;
}

interface VideoPreviewModalProps {
  video: VideoPreviewModalVideo;
  onClose: () => void;
}

export default function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  const [muted, setMuted] = useState(true);

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
        <div className="bg-black rounded-lg overflow-hidden">
          <div className="relative">
            <VideoPlayer
              src={src}
              streamingUrl={streamingUrl}
              poster={poster}
              controls
              autoplay
              muted={muted}
              loop={false}
              disableContextMenu={false}
              className="w-full aspect-video"
            />
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="absolute bottom-14 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
              aria-label={muted ? "音声をON" : "音声をOFF"}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="mt-4 text-white">
          <h3 className="text-lg font-bold">{video.title}</h3>
        </div>
      </div>
    </div>
  );
}
