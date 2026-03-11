"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VideoPlayer from "./VideoPlayer";
import { useHeaderAuth } from "@/components/header/HeaderAuthContext";

export interface HeroItem {
  thumbnail: string;
  videoUrl?: string;
  isPR?: boolean;
  moreLink?: string;
  title?: string;
}

interface HeroSectionProps {
  items: HeroItem[];
}

const FIXED_TITLE = "動画就活で理想の企業と出会う";
const FIXED_DESCRIPTION =
  "テキストだけではわからない採用企業の姿を、動画コンテンツでお届け。企業密着、社員インタビュー、職場見学など、リアルな情報を無料で視聴できます。";

function Indicators({
  items, currentIndex, goToIndex, goPrev, goNext, className,
}: {
  items: HeroItem[];
  currentIndex: number;
  goToIndex: (idx: number) => void;
  goPrev: () => void;
  goNext: () => void;
  className?: string;
}) {
  const current = items[currentIndex];
  const hasInfo = current.title || current.isPR || current.moreLink;
  const showNav = items.length > 1;
  if (!hasInfo && !showNav) return null;

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      {/* 1行目: PR＋タイトル（左） ／ もっと見る（右） */}
      {hasInfo && (
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {current.isPR && (
              <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-bold text-white bg-white/20 border border-white/40 rounded">PR</span>
            )}
            {current.title && (
              <p className="truncate text-sm font-medium text-white/90">{current.title}</p>
            )}
          </div>
          {current.moreLink && (
            <Link
              href={current.moreLink}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-white border border-white/50 rounded-full hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              もっと見る
            </Link>
          )}
        </div>
      )}
      {/* 矢印＋ドット */}
      {showNav && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={goPrev} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white/70 hover:text-white transition-all" aria-label="前のスライド">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToIndex(idx)}
                className={`rounded-full transition-all duration-300 ${idx === currentIndex ? "w-4 h-1 bg-red-500" : "w-1 h-1 bg-white/35 hover:bg-white/60"}`}
                aria-label={`スライド ${idx + 1}`}
              />
            ))}
          </div>
          <button onClick={goNext} className="w-6 h-6 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white/70 hover:text-white transition-all" aria-label="次のスライド">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function Carousel({ items }: { items: HeroItem[] }) {
  const n = items.length;
  const slides = [items[n - 1], ...items, items[0]];

  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(1);
  const [pos, setPos] = useState(1);
  const [showVideo, setShowVideo] = useState(!!items[0]?.videoUrl);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentIndex = pos <= 0 ? n - 1 : pos >= slides.length - 1 ? 0 : pos - 1;

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = "none";
    track.style.transform = "translateX(-100%)";
    void track.offsetWidth;
    track.style.transition = "transform 0.5s ease";
  }, []);

  const navigate = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const newPos = posRef.current + dir;
    posRef.current = newPos;
    track.style.transform = `translateX(-${newPos * 100}%)`;
    setIsTransitioning(true);
    setPos(newPos);
  };

  const goToIndex = (idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    const newPos = idx + 1;
    posRef.current = newPos;
    track.style.transform = `translateX(-${newPos * 100}%)`;
    setIsTransitioning(true);
    setPos(newPos);
  };

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform") return;
    setIsTransitioning(false);
    const current = posRef.current;
    let target: number | null = null;
    if (current >= slides.length - 1) target = 1;
    else if (current <= 0) target = n;
    if (target === null) return;

    const track = e.currentTarget;
    posRef.current = target;
    track.style.transition = "none";
    track.style.transform = `translateX(-${target * 100}%)`;
    void track.offsetWidth;
    track.style.transition = "transform 0.5s ease";
    setPos(target);
  };

  useEffect(() => {
    setShowVideo(!!items[currentIndex]?.videoUrl);
  }, [currentIndex]);

  const goPrev = () => navigate(-1);
  const goNext = () => navigate(1);

  return (
    <div>
      <div className="overflow-hidden rounded-xl shadow-2xl">
        <div ref={trackRef} className="flex" onTransitionEnd={handleTransitionEnd}>
          {slides.map((item, idx) => (
            <div key={idx} className="w-full flex-shrink-0 aspect-video relative">
              {showVideo && idx === pos && item.videoUrl && !isTransitioning ? (
                <VideoPlayer src={item.videoUrl} poster={item.thumbnail} autoplay={true} muted={true} className="w-full h-full" />
              ) : (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.thumbnail})` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <Indicators items={items} currentIndex={currentIndex} goToIndex={goToIndex} goPrev={goPrev} goNext={goNext} className="mt-3" />
    </div>
  );
}

export default function HeroSection({ items }: HeroSectionProps) {
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
          backgroundImage: "url(/hero-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "left top",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "scroll"
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-900 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left: 固定コンテンツ */}
          <div>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-red-500 text-white text-sm font-bold rounded">JOBTV</span>
              <span className="ml-3 text-white text-sm">延べ登録者150,000名突破</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-black mb-4 leading-normal space-y-2">
              {FIXED_TITLE.split("で").map((part, index, array) => {
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
            <p className="text-white/90 text-lg mb-6 line-clamp-3">{FIXED_DESCRIPTION}</p>
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

          {/* Right: カルーセル（アイテムがある場合のみ） */}
          {items.length > 0 && <Carousel items={items} />}
        </div>
      </div>
    </div>
  );
}
