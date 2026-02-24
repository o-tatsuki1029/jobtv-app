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
  /** true のとき右クリックでコンテキストメニューを出さない（デフォルト true） */
  disableContextMenu?: boolean;
}

export default function VideoPlayer({
  src,
  streamingUrl,
  poster,
  autoplay = false,
  controls = true,
  className = "",
  muted = false,
  loop = true,
  disableContextMenu = true
}: VideoPlayerProps) {
  // srcが.m3u8で終わる場合はHLS URLとして扱う（フロントページのvideo_urlはHLS URL）
  const isHlsUrl = src?.endsWith(".m3u8");
  const effectiveHlsUrl = streamingUrl || (isHlsUrl ? src : null);
  const effectiveFallback = isHlsUrl ? undefined : src;

  return (
    <StreamingVideoPlayer
      hlsUrl={effectiveHlsUrl}
      fallbackUrl={effectiveFallback}
      poster={poster}
      autoplay={autoplay}
      controls={controls}
      className={className}
      muted={muted}
      loop={loop}
      disableContextMenu={disableContextMenu}
    />
  );
}
