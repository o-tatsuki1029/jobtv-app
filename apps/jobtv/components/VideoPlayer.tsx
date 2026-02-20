"use client";

import StreamingVideoPlayer from "./StreamingVideoPlayer";

interface VideoPlayerProps {
  src: string; // 従来のMP4 URL（フォールバック用）
  streamingUrl?: string | null; // HLS URL
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  muted?: boolean;
  loop?: boolean;
}

export default function VideoPlayer({
  src,
  streamingUrl,
  poster,
  autoplay = false,
  controls = true,
  className = "",
  muted = false,
  loop = true
}: VideoPlayerProps) {
  return (
    <StreamingVideoPlayer
      hlsUrl={streamingUrl}
      fallbackUrl={src}
      poster={poster}
      autoplay={autoplay}
      controls={controls}
      className={className}
      muted={muted}
      loop={loop}
    />
  );
}
