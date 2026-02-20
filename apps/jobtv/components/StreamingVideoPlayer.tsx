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
}

export default function StreamingVideoPlayer({
  hlsUrl,
  fallbackUrl,
  poster,
  autoplay = false,
  controls = true,
  className = "",
  muted = false,
  loop = false
}: StreamingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // HLS URLが利用可能な場合
    if (hlsUrl) {
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
                console.error("HLS network error, trying to recover");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error("HLS media error, trying to recover");
                hls.recoverMediaError();
                break;
              default:
                console.error("HLS fatal error, destroying");
                hls.destroy();
                // フォールバックに切り替え
                if (fallbackUrl) {
                  video.src = fallbackUrl;
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
        if (fallbackUrl) {
          video.src = fallbackUrl;
        } else {
          setError("このブラウザでは動画を再生できません");
        }
      }
    } else if (fallbackUrl) {
      // HLS URLがない場合は従来のMP4を使用
      video.src = fallbackUrl;
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
  }, [hlsUrl, fallbackUrl, autoplay]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 ${className}`}>
        <p className="text-white">{error}</p>
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
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}

