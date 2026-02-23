"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "./VideoPlayer";
import { useHeaderAuth } from "@/components/header/HeaderAuthContext";

interface HeroSectionProps {
  title: string;
  description: string;
  thumbnail: string;
  videoUrl?: string;
  channel: string;
  viewers?: number;
}

export default function HeroSection({ title, description, thumbnail, videoUrl, channel, viewers }: HeroSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(!!videoUrl);
  const auth = useHeaderAuth();
  const router = useRouter();

  const handleWatchClick = () => {
    if (!auth?.user) {
      router.push(`/auth/login?next=${encodeURIComponent("/#short")}`);
      return;
    }
    document.getElementById("short")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative w-full bg-black py-12 md:py-16 overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundImage: `url(https://jobtv.jp/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Flive-week-back.a9963dc1.jpg&w=3840&q=75)`,
          backgroundSize: "cover",
          backgroundPosition: "left top",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "scroll"
        }}
      />
      {/* Right side overlay to create the 30% overflow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-900 pointer-events-none" />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Title and Description */}
          <div>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-red-500 text-white text-sm font-bold rounded">{channel}</span>
              {viewers && <span className="ml-3 text-white text-sm">延べ登録者150,000名突破</span>}
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-black mb-4 leading-normal space-y-2">
              {title.split("で").map((part, index, array) => {
                const lineText = index < array.length - 1 ? `${part}で` : part;
                const parts = lineText.split("動画就活");
                return (
                  <span key={index} className="block overflow-hidden">
                    <span
                      className="inline-block px-4 py-1 bg-white animate-hero-wipe-in rounded-sm"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      {parts.length === 1 ? (
                        lineText
                      ) : (
                        <>
                          {parts.map((p, i) => (
                            <span key={i}>
                              {i > 0 && <span className="text-rainbow-animate">動画就活</span>}
                              {p}
                            </span>
                          ))}
                        </>
                      )}
                    </span>
                  </span>
                );
              })}
            </h1>
            <p className="text-white/90 text-lg mb-6 line-clamp-3">{description}</p>
            <div>
              <button
                onClick={handleWatchClick}
                className="flex items-center gap-2 px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                今すぐ視聴
              </button>
            </div>
          </div>

          {/* Right side - Video */}
          <div className="relative">
            {showVideo && videoUrl ? (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
                <VideoPlayer src={videoUrl} poster={thumbnail} autoplay={true} muted={true} className="w-full h-full" />
              </div>
            ) : (
              <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl group cursor-pointer">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${thumbnail})`
                  }}
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <button
                    onClick={() => {
                      if (videoUrl) {
                        setShowVideo(true);
                      }
                    }}
                    className="w-20 h-20 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
                  >
                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
