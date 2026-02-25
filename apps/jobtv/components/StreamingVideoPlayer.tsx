"use client";

import { useRef, useEffect, useState } from "react";
import Hls from "hls.js";

interface StreamingVideoPlayerProps {
  hlsUrl?: string | null;
  fallbackUrl?: string; // 従来のMP4 URL（フォールバック用）
  poster?: string;
  autoplay?: boolean;
  controls?: boolean;
  className?: string;
  muted?: boolean;
  loop?: boolean;
  /** true のとき右クリックでコンテキストメニューを出さない（デフォルト true） */
  disableContextMenu?: boolean;
}

export default function StreamingVideoPlayer({
  hlsUrl,
  fallbackUrl,
  poster,
  autoplay = false,
  controls = true,
  className = "",
  muted = false,
  loop = false,
  disableContextMenu = true
}: StreamingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setError(null);
    setRetryCount((c) => c + 1);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // URL が変わったらエラー表示をリセット
    setError(null);

    const hasHls = hlsUrl && hlsUrl.trim() !== "";
    const hasFallback = fallbackUrl && fallbackUrl.trim() !== "";

    // ソースが無い場合は video をクリアしてエラー表示
    if (!hasHls && !hasFallback) {
      video.removeAttribute("src");
      video.load();
      setError("再生できる動画がありません");
      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }

    // HLS URLが利用可能な場合
    if (hasHls) {
      if (Hls.isSupported()) {
        // HLS.jsを使用（Chrome, Firefox, Edge等）
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoplay) {
            video.play().catch((err) => {
              console.log("Autoplay prevented:", err);
            });
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn("HLS network error, using fallback");
                hls.destroy();
                if (hasFallback) {
                  const url = fallbackUrl!;
                  const isM3u8 = url.trim().toLowerCase().endsWith(".m3u8");
                  // .m3u8 を video.src にしても Chrome 等では再生されず poster のみになるため、エラー表示にする
                  if (isM3u8) {
                    setError("動画の読み込みに失敗しました");
                  } else {
                    video.src = url;
                    if (autoplay) video.play().catch(() => {});
                  }
                } else {
                  setError("動画の読み込みに失敗しました");
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("HLS media error, trying to recover");
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal error, destroying");
                hls.destroy();
                if (hasFallback) {
                  const url = fallbackUrl!;
                  const isM3u8 = url.trim().toLowerCase().endsWith(".m3u8");
                  if (isM3u8) {
                    setError("動画の読み込みに失敗しました");
                  } else {
                    video.src = url;
                    if (autoplay) video.play().catch(() => {});
                  }
                } else {
                  setError("動画の読み込みに失敗しました");
                }
                break;
            }
          }
        });

        hlsRef.current = hls;

        return () => {
          if (hls) {
            hls.destroy();
          }
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // SafariネイティブHLSサポート
        video.src = hlsUrl;
        if (autoplay) {
          video.play().catch((err) => {
            console.log("Autoplay prevented:", err);
          });
        }
      } else {
        // HLS未対応ブラウザはフォールバック
        if (hasFallback) {
          video.src = fallbackUrl!;
        } else {
          setError("このブラウザでは動画を再生できません");
        }
      }
    } else if (hasFallback) {
      // HLS URLがない場合は従来のMP4を使用
      video.src = fallbackUrl!;
      if (autoplay) {
        video.play().catch((err) => {
          console.log("Autoplay prevented:", err);
        });
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl, fallbackUrl, autoplay, retryCount]);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-gray-900 ${className}`}>
        <p className="text-white">{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="px-4 py-2 text-sm font-medium text-gray-900 bg-white rounded-lg hover:bg-gray-100 transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-cover"
        controls={controls}
        muted={muted}
        loop={loop}
        playsInline
        autoPlay={autoplay}
        controlsList="nodownload"
        {...(disableContextMenu ? { onContextMenu: (e: React.MouseEvent<HTMLVideoElement>) => e.preventDefault() } : {})}
      />
    </div>
  );
}
