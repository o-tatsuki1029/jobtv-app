"use client";

import { Fragment, useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import Image from "next/image";
import Script from "next/script";
import Footer from "@/components/Footer";

// 共通スタイル定数
const styles = {
  // セクションタイトル
  sectionLabel: "text-[11px] tracking-[0.16em] uppercase text-[#ff5f6d] mb-1.5",
  sectionTitle: "text-2xl md:text-[28px] font-semibold leading-[1.3] mb-4",
  sectionTitleCenter: "text-2xl md:text-[28px] font-semibold leading-[1.3] mb-4 text-center",

  // ボタン
  buttonPrimary:
    "inline-flex items-center justify-center gap-1.5 px-8 py-4 rounded-full text-lg font-bold tracking-wide uppercase border-none bg-gradient-to-br from-[#ff2b4d] to-[#ff7a53] text-white shadow-[0_8px_24px_rgba(255,43,77,0.4)] hover:shadow-[0_12px_32px_rgba(255,43,77,0.5)] hover:scale-105 active:scale-100 transition-all duration-300 ease-out whitespace-nowrap cursor-pointer",
  buttonPrimaryNoShadow:
    "items-center justify-center gap-1.5 px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide uppercase border-none bg-gradient-to-br from-[#ff2b4d] to-[#ff7a53] text-white hover:opacity-90 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer",
  buttonPrimaryNoShadowLarge:
    "inline-flex items-center justify-center gap-1.5 px-8 py-4 rounded-full text-lg font-semibold tracking-wide uppercase border-none bg-gradient-to-br from-[#ff2b4d] to-[#ff7a53] text-white hover:opacity-90 transition-all duration-200 ease-out whitespace-nowrap cursor-pointer",
  buttonSecondary:
    "inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-full text-[13px] font-semibold tracking-wide uppercase border border-black/[0.12] bg-transparent text-gray-800 hover:border-black/[0.24] hover:bg-black/[0.04] transition-all duration-[180ms] ease-out whitespace-nowrap cursor-pointer",
  buttonOutline:
    "items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-full text-[13px] font-semibold tracking-wide uppercase border border-white/[0.22] text-[#f7f7f7] hover:border-white/50 hover:bg-[rgba(16,16,20,0.9)] transition-all duration-[180ms] ease-out whitespace-nowrap",

  // セクション
  sectionPadding: "py-[60px]",
  sectionPaddingLarge: "pb-[60px] pt-[100px] md:pt-[132px]",

  // ナビゲーションリンク
  navLink:
    "relative pb-1.5 transition-colors duration-200 hover:text-white after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-[#ff2b4d] after:to-[#ff7a53] after:transition-all after:duration-300 after:ease-[cubic-bezier(0.4,0,0.2,1)] after:shadow-[0_0_8px_rgba(255,43,77,0.4)] hover:after:w-full",

  // グラデーションテキスト
  gradientText: "bg-gradient-to-br from-[#ff2b4d] to-[#ff9453] bg-clip-text text-transparent",
  gradientTextRed: "bg-gradient-to-br from-[#ff2b4d] to-[#ff7a5c] bg-clip-text text-transparent"
} as const;

// FAQアイテムコンポーネント
interface FAQItemProps {
  question: string;
  answer: string | React.ReactNode;
  defaultOpen?: boolean;
}

function FAQItem({ question, answer, defaultOpen = false }: FAQItemProps) {
  return (
    <details
      className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
      open={defaultOpen}
    >
      <summary className="list-none cursor-pointer flex items-center justify-between gap-3.5 p-5 text-base md:text-lg font-semibold text-gray-800 hover:text-[#ff5f6d] transition-colors after:content-['+'] after:text-2xl after:text-[#ff5f6d] after:font-light after:flex-shrink-0 after:transition-transform after:duration-300 group-open:after:rotate-45 [&::-webkit-details-marker]:hidden">
        {question}
      </summary>
      <div className="px-5 pb-5 animate-fadeIn">
        {typeof answer === "string" ? (
          <p className="text-sm md:text-base text-gray-700 leading-relaxed">{answer}</p>
        ) : (
          <div className="text-sm md:text-base text-gray-700 leading-relaxed">{answer}</div>
        )}
      </div>
    </details>
  );
}

// サンプル動画カードコンポーネント
interface SampleVideoCardProps {
  videoSrc: string;
  thumbnailUrl?: string | null;
  tag: string;
  duration: string;
  title: string;
  description: string;
  onOpenModal: (src: string) => void;
  animationDelay?: string;
}

function SampleVideoCard({
  videoSrc,
  thumbnailUrl,
  tag,
  duration,
  title,
  description,
  onOpenModal,
  animationDelay = "0s"
}: SampleVideoCardProps) {
  return (
    <article
      className="rounded-lg border border-black/8 bg-white p-3 pb-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] fade-in-up"
      style={{ animationDelay }}
    >
      <div
        className="relative rounded-lg overflow-hidden aspect-[9/16] max-h-[300px] bg-[radial-gradient(circle_at_top,rgba(255,100,120,0.12),rgba(245,245,250,1))] cursor-pointer group mx-auto"
        onClick={() => onOpenModal(videoSrc)}
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <video src={videoSrc} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-md text-[11px] text-white bg-[rgba(26,26,34,0.92)] border border-white/30">
          {tag}
        </div>
        <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md text-[11px] text-white bg-black/70 backdrop-blur-sm">
          {duration}
        </div>
      </div>
      <h3 className="text-base md:text-lg mt-2.5 mb-1 text-gray-800 font-semibold text-center">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </article>
  );
}

// ヒーロー動画コンポーネント（HLS対応・ローディング状態付き）
function HeroVideo({ src, hlsSrc, thumbnail, onReady }: { src: string; hlsSrc?: string | null; thumbnail?: string | null; onReady?: () => void }) {
  const isFirst = !!onReady;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const markReady = () => {
      if (!loaded) {
        setLoaded(true);
        onReady?.();
      }
    };

    // HLS URL がある場合はストリーミング再生
    if (hlsSrc) {
      if (Hls.isSupported()) {
        const hls = new Hls({ startLevel: 0 });
        hlsRef.current = hls;
        hls.loadSource(hlsSrc);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          markReady();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          hls.destroy();
          hlsRef.current = null;
          video.src = src;
          video.addEventListener("canplay", markReady, { once: true });
          video.play().catch(() => {});
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsSrc;
        video.addEventListener("canplay", markReady, { once: true });
        video.play().catch(() => {});
      } else {
        video.src = src;
        video.addEventListener("canplay", markReady, { once: true });
      }
    } else {
      video.src = src;
      video.addEventListener("canplay", markReady, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, hlsSrc]);

  return (
    <div className="w-full h-full flex-shrink-0 relative bg-black">
      {!loaded && isFirst && (
        <div className="absolute inset-0">
          {thumbnail && (
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover block ${isFirst && !loaded ? "opacity-0" : ""}`}
        autoPlay
        muted
        loop
        playsInline
        preload={isFirst ? "auto" : "metadata"}
      />
    </div>
  );
}

// 汎用HLS動画コンポーネント（モーダル等用）
function HlsVideo({
  src,
  hlsSrc,
  className,
  controls,
  autoPlay
}: {
  src: string;
  hlsSrc?: string | null;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsSrc && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(hlsSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        hls.destroy();
        hlsRef.current = null;
        video.src = src;
        if (autoPlay) video.play().catch(() => {});
      });
    } else if (hlsSrc && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsSrc;
    } else {
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, hlsSrc, autoPlay]);

  return (
    <video
      ref={videoRef}
      className={className}
      controls={controls}
      autoPlay={autoPlay}
      playsInline
    />
  );
}

// セクションタイトルコンポーネント
interface SectionTitleProps {
  label: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  center?: boolean;
}

function SectionTitle({ label, title, description, center = false }: SectionTitleProps) {
  return (
    <div className={center ? "text-left md:text-center mb-12" : "mb-12"}>
      <p className={styles.sectionLabel}>{label}</p>
      {typeof title === "string" ? (
        <h2 className={center ? styles.sectionTitleCenter : styles.sectionTitle}>{title}</h2>
      ) : (
        <h2 className={center ? styles.sectionTitleCenter : styles.sectionTitle}>{title}</h2>
      )}
      {description && (
        <div className="mt-4">
          {typeof description === "string" ? (
            <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">{description}</p>
          ) : (
            <div className="text-base md:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">{description}</div>
          )}
        </div>
      )}
    </div>
  );
}

// セクション下部CTA共通コンポーネント
function SectionCTA({
  dark = false,
  onAnchorClick
}: {
  dark?: boolean;
  onAnchorClick: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const secondaryClass = dark
    ? "inline-flex items-center justify-center gap-1.5 px-6 py-4 rounded-full text-base font-semibold tracking-wide border border-white/[0.22] bg-transparent text-[#f7f7f7] hover:border-white/50 hover:bg-white/[0.05] transition-all duration-[180ms] ease-out whitespace-nowrap cursor-pointer"
    : "inline-flex items-center justify-center gap-1.5 px-6 py-4 rounded-full text-base font-semibold tracking-wide border border-black/[0.12] bg-transparent text-gray-800 hover:border-black/[0.24] hover:bg-black/[0.04] transition-all duration-[180ms] ease-out whitespace-nowrap cursor-pointer";
  return (
    <div className="flex flex-col md:flex-row gap-3 mt-10 items-center justify-center">
      <a href="#contact" onClick={(e) => onAnchorClick(e, "#contact")} className={styles.buttonPrimaryNoShadowLarge}>
        無料で相談・お見積り依頼
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 ml-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </span>
      </a>
      <button className={secondaryClass} type="button">
        資料ダウンロード
        <svg
          className="ml-1.5"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>
  );
}

type SampleVideo = {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  auto_thumbnail_url: string | null;
  hls_url: string | null;
  conversion_status: string | null;
  tag: string;
  title: string;
  description: string;
  duration: string;
};

type FaqItemData = {
  id: string;
  question: string;
  answer: string;
};

type CompanyLogo = {
  id: string;
  name: string;
  image_url: string;
  row_position: string;
};

interface LPClientProps {
  sampleVideos: SampleVideo[];
  faqItems: FaqItemData[];
  companyLogosTop: CompanyLogo[];
  companyLogosBottom: CompanyLogo[];
  scrollBanner: { image_url: string; link_url: string } | null;
}

export function LPClient({
  sampleVideos,
  faqItems,
  companyLogosTop,
  companyLogosBottom,
  scrollBanner
}: LPClientProps) {
  const [formData, setFormData] = useState({
    company: "",
    name: "",
    email: "",
    message: ""
  });

  const videoList = sampleVideos.map((v) => v.video_url);
  const hlsList = sampleVideos.map((v) =>
    v.conversion_status === "completed" ? v.hls_url : null
  );
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [showScrollBanner, setShowScrollBanner] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [heroVideoIndex, setHeroVideoIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [heroVideosReady, setHeroVideosReady] = useState(false);
  const heroVideoContainerRef = useRef<HTMLDivElement>(null);
  const heroVideoIndexRef = useRef(0);

  // 最初の動画を最後にも追加（シームレスループ用）
  const heroVideoList = videoList.length > 0 ? [...videoList, videoList[0]] : [];
  const heroHlsList = hlsList.length > 0 ? [...hlsList, hlsList[0]] : [];
  const thumbnailList = sampleVideos.map((v) => v.auto_thumbnail_url ?? v.thumbnail_url ?? null);
  const heroThumbnailList = thumbnailList.length > 0 ? [...thumbnailList, thumbnailList[0]] : [];

  // ナビゲーションメニューアイテム
  const navItems = [
    { href: "#about", label: "サービス概要" },
    { href: "#samples", label: "制作サンプル" },
    { href: "#services", label: "サービスの特徴" },
    { href: "#faq", label: "FAQ" }
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: フォーム送信処理を実装
    console.log("Form submitted:", formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const openVideoModal = (videoSrc: string) => {
    const index = videoList.indexOf(videoSrc);
    setSelectedVideoIndex(index >= 0 ? index : null);
  };

  const closeVideoModal = useCallback(() => {
    setSelectedVideoIndex(null);
  }, []);

  const goToPreviousVideo = useCallback(() => {
    if (selectedVideoIndex !== null) {
      const prevIndex = selectedVideoIndex > 0 ? selectedVideoIndex - 1 : videoList.length - 1;
      setSelectedVideoIndex(prevIndex);
    }
  }, [selectedVideoIndex, videoList.length]);

  const goToNextVideo = useCallback(() => {
    if (selectedVideoIndex !== null) {
      const nextIndex = selectedVideoIndex < videoList.length - 1 ? selectedVideoIndex + 1 : 0;
      setSelectedVideoIndex(nextIndex);
    }
  }, [selectedVideoIndex, videoList.length]);

  // キーボード操作（ESCで閉じる、左右矢印で切り替え）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVideoIndex === null) return;

      if (e.key === "Escape") {
        closeVideoModal();
      } else if (e.key === "ArrowLeft") {
        goToPreviousVideo();
      } else if (e.key === "ArrowRight") {
        goToNextVideo();
      }
    };

    if (selectedVideoIndex !== null) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedVideoIndex, goToPreviousVideo, goToNextVideo, closeVideoModal]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const targetId = href.replace("#", "");
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const headerHeight = 72; // ヘッダーの高さ
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }

    // モバイルメニューが開いている場合は閉じる
    if (isMobileMenuOpen) {
      closeMobileMenu();
    }
  };

  // モバイルメニューが開いている時に背面をスクロールさせない
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // JavaScriptが有効な場合にno-jsクラスを削除
  useEffect(() => {
    document.documentElement.classList.remove("no-js");
  }, []);

  // スクロールで画面内に入った時にアニメーションを実行
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-up-active");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(".fade-in-up:not(.fade-in-up-active)");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [sampleVideos, faqItems, companyLogosTop]);

  // スクロール位置を監視してバナーを表示
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      // 300pxスクロールしたら表示
      setShowScrollBanner(scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    // 初期状態もチェック
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // バナーの表示/非表示を制御
  useEffect(() => {
    if (showScrollBanner) {
      setIsBannerVisible(true);
    } else {
      // アニメーション完了後に非表示にする
      const timer = setTimeout(() => {
        setIsBannerVisible(false);
      }, 500); // アニメーション時間と同じ
      return () => clearTimeout(timer);
    }
  }, [showScrollBanner]);

  // メニューの表示/非表示を制御
  useEffect(() => {
    if (isMobileMenuOpen) {
      setIsMenuVisible(true);
    } else {
      // アニメーション完了後に非表示にする
      const timer = setTimeout(() => {
        setIsMenuVisible(false);
      }, 300); // アニメーション時間と同じ
      return () => clearTimeout(timer);
    }
  }, [isMobileMenuOpen]);

  // heroVideoIndexの更新時にrefも更新
  useEffect(() => {
    heroVideoIndexRef.current = heroVideoIndex;
  }, [heroVideoIndex]);

  // スクロール完了時にリセット（最後の動画に到達した時）
  useEffect(() => {
    const container = heroVideoContainerRef.current;
    if (!container) return;

    const handleTransitionEnd = (e: TransitionEvent) => {
      // transformのtransitionが完了した時のみ処理
      if (e.propertyName === "transform") {
        // 最後の動画（最初の動画の2セット目）に到達した場合
        if (heroVideoIndexRef.current === videoList.length) {
          // アニメーションを無効化してリセット
          setIsTransitioning(false);
          requestAnimationFrame(() => {
            setHeroVideoIndex(0);
            // アニメーションを再有効化
            requestAnimationFrame(() => {
              setIsTransitioning(true);
            });
          });
        }
      }
    };

    container.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      container.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [videoList.length]);

  // ヒーロー動画の自動切り替え（2秒ごと・全動画読み込み後のみ）
  useEffect(() => {
    if (!heroVideosReady) return;

    const interval = setInterval(() => {
      setHeroVideoIndex((prev) => {
        if (prev < videoList.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [videoList.length, heroVideosReady]);

  return (
    <>
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
      <header className="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-[10px] bg-[#1a1a22] border-b border-white/8">
        <div className="w-full max-w-[1620px] mx-auto px-5 flex items-center justify-between h-[72px]">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-start">
              <img src="/logo.svg" alt="JOBTV" className="h-6 w-auto mb-1 mx-auto" />
              <p className="text-[10px] md:text-xs text-white leading-tight font-bold">採用マーケティング支援</p>
            </div>
            {/* デスクトップナビゲーション */}
            <nav className="hidden md:flex gap-8 text-base font-medium text-gray-400">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleAnchorClick(e, item.href)}
                  className={styles.navLink}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {/* デスクトップボタン */}
            <a
              href="#contact"
              onClick={(e) => handleAnchorClick(e, "#contact")}
              className={`hidden md:inline-flex ${styles.buttonPrimaryNoShadow}`}
            >
              無料で相談・お見積り依頼
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/90 ml-1.5">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </span>
            </a>
            <a
              href="#contact"
              onClick={(e) => handleAnchorClick(e, "#contact")}
              className="hidden md:inline-flex items-center justify-center gap-1.5 px-[18px] py-2.5 rounded-full text-[13px] font-semibold tracking-wide border border-white/[0.22] bg-transparent text-[#f7f7f7] hover:border-white/50 hover:bg-[rgba(16,16,20,0.9)] transition-all duration-[180ms] ease-out whitespace-nowrap"
            >
              資料ダウンロード
              <svg
                className="ml-1.5"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
            {/* モバイルメニューボタン */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden flex items-center justify-center w-12 h-12 text-gray-400 hover:text-white transition-colors"
              aria-label="メニューを開く"
            >
              {isMobileMenuOpen ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* モバイルメニュー */}
      {isMenuVisible && (
        <>
          {/* 背景オーバーレイ */}
          <div
            className={`md:hidden fixed inset-0 top-[72px] bg-black/50 z-[59] transition-opacity duration-300 ${
              isMobileMenuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMobileMenu}
          />
          {/* メニューパネル */}
          <div
            className={`md:hidden fixed top-[72px] right-0 bottom-0 w-[calc(100%-60px)] max-w-[320px] bg-[rgba(26,26,34,0.99)] backdrop-blur-[20px] z-[60] overflow-y-auto shadow-2xl ${
              isMobileMenuOpen ? "animate-slideInFromRight" : "animate-slideOutToRight"
            }`}
          >
            <nav className="flex flex-col px-5 py-8 space-y-6">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleAnchorClick(e, item.href)}
                  className="text-lg font-medium text-gray-400 hover:text-white transition-colors duration-200 py-2 border-b border-white/8"
                >
                  {item.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 mt-4">
                <a
                  href="#contact"
                  onClick={(e) => handleAnchorClick(e, "#contact")}
                  className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-full text-sm font-semibold tracking-wide uppercase border-none bg-gradient-to-br from-[#ff2b4d] to-[#ff7a53] text-white hover:opacity-90 transition-all duration-200 ease-out"
                >
                  無料で相談・お見積り依頼
                </a>
                <a
                  href="#contact"
                  onClick={(e) => handleAnchorClick(e, "#contact")}
                  className="inline-flex items-center justify-center gap-1.5 px-[18px] py-3 rounded-full text-sm font-semibold tracking-wide border border-white/[0.22] bg-transparent text-[#f7f7f7] hover:border-white/50 hover:bg-[rgba(16,16,20,0.9)] transition-all duration-[180ms] ease-out"
                >
                  資料ダウンロード
                  <svg className="ml-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </a>
              </div>
              <div className="flex flex-col gap-2 mt-6 pt-6 border-t border-white/8">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <a
                    href="tel:070-1420-9873"
                    className="text-lg font-semibold text-white hover:text-[#ff5f6d] transition-colors"
                  >
                    070-1420-9873
                  </a>
                </div>
                <p className="text-sm text-gray-400">受付時間：平日 10:00 ～ 18:00（土日・祝日除く）</p>
              </div>
            </nav>
          </div>
        </>
      )}

      <main>
        {/* ヒーローセクション */}
        <section className={`${styles.sectionPaddingLarge} bg-white relative overflow-hidden`}>
          <div className="absolute inset-0">
            <Image
              src="/service/recruitment-marketing/images/hero-bg-sp.png"
              alt=""
              fill
              className="md:hidden object-cover"
              aria-hidden="true"
              priority
            />
            <Image
              src="/service/recruitment-marketing/images/hero-bg.png"
              alt=""
              fill
              className="hidden md:block object-cover"
              aria-hidden="true"
              priority
            />
            <div className="absolute inset-0 bg-white/50"></div>
          </div>
          <div className="relative z-10 w-full max-w-[1120px] mx-auto px-5 grid grid-cols-1 md:grid-cols-[1fr_1fr] lg:grid-cols-[1.1fr_1fr] gap-4 md:gap-0 items-center">
            <div className="order-1 md:order-2 mx-auto text-center md:text-left">
              <div className="inline-flex mb-3 p-px rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <p className="flex items-center gap-1.5 text-xs md:text-sm text-gray-600 font-medium px-4 py-1.5 rounded-full bg-white">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15 12L12 22L9 12Z" fill="url(#sparkle-grad)" />
                    <path d="M2 12L12 9L22 12L12 15Z" fill="url(#sparkle-grad)" />
                    <defs>
                      <linearGradient id="sparkle-grad" x1="4" y1="2" x2="20" y2="20">
                        <stop stopColor="#22d3ee" />
                        <stop offset="0.5" stopColor="#a855f7" />
                        <stop offset="1" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  ターゲットに届く、攻めの採用。
                </p>
              </div>
              <h1 className="tracking-[0.02em] leading-[1.4] md:leading-[1.5] mb-3 text-gray-800 font-bold">
                <span className="inline-block text-2xl md:text-3xl mb-2">就活生を動かす</span>
                <br />
                <span className="inline-block mb-2">
                  <span className={`${styles.gradientText} text-5xl md:text-7xl`}>採用特化</span>
                  <span className="text-3xl md:text-4xl">の</span>
                </span>
                <br />
                <span className="inline-block text-3xl md:text-4xl">JOBTVマーケティング支援</span>
              </h1>

              <div className="flex flex-col md:flex-row gap-3 mb-8 items-center md:items-start justify-center md:justify-start">
                <a
                  href="#contact"
                  onClick={(e) => handleAnchorClick(e, "#contact")}
                  className={styles.buttonPrimaryNoShadowLarge}
                >
                  無料で相談・お見積り依頼
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/90 ml-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </a>
                <button
                  className="inline-flex items-center justify-center gap-1.5 px-6 py-4 rounded-full text-base font-semibold tracking-wide border border-black/[0.12] bg-transparent text-gray-800 hover:border-black/[0.24] hover:bg-black/[0.04] transition-all duration-[180ms] ease-out whitespace-nowrap cursor-pointer"
                  type="button"
                >
                  資料ダウンロード
                  <svg
                    className="ml-1.5"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-4 justify-center md:justify-start">
                <div className="flex-1 max-w-[220px] px-3 py-2 rounded-lg border border-black/8 bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
                  <p className="text-xs text-gray-700 font-bold">BtoB商社企業実績</p>
                  <p className="text-[10px] text-gray-600">内定承諾率</p>
                  <p className={`text-lg font-bold leading-tight ${styles.gradientTextRed}`}>最大300%UP</p>
                  <p className="text-[9px] text-gray-400">ショート動画活用の一例</p>
                </div>
                <div className="flex-1 max-w-[220px] px-3 py-2 rounded-lg border border-black/8 bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
                  <p className="text-xs text-gray-700 font-bold">建材メーカー企業実績</p>
                  <p className="text-[10px] text-gray-600">SNS経由応募率</p>
                  <p className={`text-lg font-bold leading-tight ${styles.gradientTextRed}`}>最大200%UP</p>
                  <p className="text-[9px] text-gray-400">ショート動画×SNSアルゴリズム活用の一例</p>
                </div>
              </div>
            </div>
            {/* スマホ表示 */}
            <div className="flex order-1 justify-center py-1 hero-screen">
              <div className="relative w-[60%] md:w-[260px]">
                {/* グロー効果 */}
                <div className="absolute -inset-4 bg-gradient-to-br from-[#ff2b4d]/20 via-purple-400/10 to-cyan-400/20 rounded-[32px] blur-2xl" />
                {/* 端末フレーム */}
                <div className="relative w-full aspect-[9/16] rounded-[28px] p-[3px] bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rotate-[-2deg]">
                  {/* ノッチ */}
                  <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[60px] h-[14px] bg-black rounded-full z-20" />
                  {/* スクリーン */}
                  <div className="absolute inset-[3px] rounded-[25px] overflow-hidden bg-black">
                    <div
                      ref={heroVideoContainerRef}
                      className="flex flex-col h-full"
                      style={{
                        transform: `translateY(-${heroVideoIndex * 100}%)`,
                        transition: isTransitioning ? "transform 600ms ease-in-out" : "none"
                      }}
                    >
                      {heroVideoList.map((videoSrc, index) => (
                        <HeroVideo
                          key={index}
                          src={videoSrc}
                          hlsSrc={heroHlsList[index]}
                          thumbnail={heroThumbnailList[index]}
                          onReady={index === 0 ? () => setHeroVideosReady(true) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 実績・導入企業 */}
        <section className="py-[10px] bg-[#fff]" id="clients">
          <div className="relative overflow-hidden w-full select-none">
            {/* 上段：右から左へ */}
            <div className="flex animate-scroll-infinite select-none w-[200%]">
              {/* 1セット目 */}
              <div className="flex items-center flex-shrink-0 select-none w-1/2">
                {companyLogosTop.map((logo) => (
                  <div
                    key={`logo-top-1-${logo.id}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={logo.image_url}
                      alt={logo.name}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
              {/* 2セット目（シームレスループ用） */}
              <div className="flex items-center flex-shrink-0 select-none w-1/2">
                {companyLogosTop.map((logo) => (
                  <div
                    key={`logo-top-2-${logo.id}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={logo.image_url}
                      alt={logo.name}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* 下段：左から右へ */}
            <div className="flex animate-scroll-infinite-reverse select-none w-[200%]">
              {/* 1セット目 */}
              <div className="flex items-center flex-shrink-0 select-none w-1/2">
                {companyLogosBottom.map((logo) => (
                  <div
                    key={`logo-bottom-1-${logo.id}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={logo.image_url}
                      alt={logo.name}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
              {/* 2セット目（シームレスループ用） */}
              <div className="flex items-center flex-shrink-0 select-none w-1/2">
                {companyLogosBottom.map((logo) => (
                  <div
                    key={`logo-bottom-2-${logo.id}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={logo.image_url}
                      alt={logo.name}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <h2 className="text-sm font-semibold text-gray-600 text-center">JOBTVサービスご利用企業</h2>
        </section>

        {/* JOBTVのマーケティング支援とは？ */}
        <section className="py-[60px] bg-[#f0faff] text-black relative overflow-hidden" id="about">
          {/* 背景装飾（SVGパス） */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none">
              <defs>
                <linearGradient id="aboutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#47acde" stopOpacity="1" />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity=".5" />
                </linearGradient>
              </defs>
              {/* シンプルな波 */}
              <path d="M0,500 Q600,400 1200,500 L1200,800 L0,800 Z" fill="url(#aboutGradient)" />
            </svg>
          </div>
          <div className="relative z-10 w-full max-w-[1120px] mx-auto px-5 items-center">
            <div className="text-left md:text-center mb-10">
              <p className={styles.sectionLabel}>About</p>
              <h2 className="text-2xl md:text-[28px] font-semibold leading-[1.3] mb-3">
                JOBTVの<span className="hero-highlight">採用マーケティング支援</span>とは？
              </h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                若手人材が普段から利用するSNS媒体での発信を軸に、
                <br className="hidden md:inline" />
                認知拡大から歩留まり改善までを支援する、総合マーケティング支援サービスです。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-6 items-center">
              {/* ファネル画像 */}
              <div className="flex justify-center">
                <Image
                  src="/service/recruitment-marketing/images/about.png"
                  alt="JOBTVのマーケティング支援イメージ"
                  width={420}
                  height={420}
                  loading="lazy"
                  className="block w-full max-w-[420px] h-auto object-contain"
                />
              </div>

              {/* 3つのカード（縦並び、下に行くほど右にずれる） */}
              <div className="space-y-3 relative">
                {/* カード1: 採用ターゲットへの認知強化 */}
                <div
                  className="relative rounded-lg py-3 px-6 bg-gradient-to-br from-[#43afde] to-[#7C3AED] text-white shadow-lg md:mr-16 overflow-hidden fade-in-up"
                  style={{ animationDelay: "0s" }}
                >
                  <span className="absolute bottom-0 right-4 text-[80px] md:text-[100px] font-bold text-white/15 leading-none">
                    1
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-base md:text-lg font-semibold mb-2 flex items-center gap-2">
                      <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      採用ターゲットへの認知強化
                    </h3>
                    <ul className="space-y-1.5 text-sm">
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>SNS 縦型動画の再生数保証</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>ターゲット層へ効率的にリーチ</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>企画から運用までワンストップ支援</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* カード2: エントリー導線の最適化 */}
                <div
                  className="relative rounded-lg py-3 px-6 bg-gradient-to-br from-[#43afde] to-[#7C3AED] text-white shadow-lg md:ml-8 md:mr-8 overflow-hidden fade-in-up"
                  style={{ animationDelay: "0.15s" }}
                >
                  <span className="absolute bottom-0 right-4 text-[80px] md:text-[100px] font-bold text-white/15 leading-none">
                    2
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-base md:text-lg font-semibold mb-2 flex items-center gap-2">
                      <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      エントリー導線の最適化
                    </h3>
                    <ul className="space-y-1.5 text-sm">
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>縦型動画経由に最適化した予約ページ</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>有効な母集団を最大化</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>予約者情報をエクスポート可能</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* カード3: 動画接触による歩留まり改善 */}
                <div
                  className="relative rounded-lg py-3 px-6 bg-gradient-to-br from-[#43afde] to-[#7C3AED] text-white shadow-lg md:ml-16 overflow-hidden fade-in-up"
                  style={{ animationDelay: "0.3s" }}
                >
                  <span className="absolute bottom-0 right-4 text-[80px] md:text-[100px] font-bold text-white/15 leading-none">
                    3
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-base md:text-lg font-semibold mb-2 flex items-center gap-2">
                      <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      動画接触による歩留まり改善
                    </h3>
                    <ul className="space-y-1.5 text-sm">
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>熱量が伝わる動画で動機形成の深化</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>選考中の熱量低下を防止</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 mt-0.5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>採用後のミスマッチを防止</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <SectionCTA onAnchorClick={handleAnchorClick} />
          </div>
        </section>

        {/* サンプル */}
        <section className="py-[60px] bg-[#1a1a22]" id="samples">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <div className="text-left md:text-center">
              <p className={styles.sectionLabel}>Samples</p>
              <h2 className="text-2xl md:text-[28px] font-semibold leading-[1.3] mb-3">採用ショート動画の作成事例</h2>
              <p className="text-sm md:text-base leading-relaxed">
                国内No.1<sup>*</sup>
                のPR集団「ベクトルグループ」が、年間約3,000件のプロジェクトで培ったナレッジに基づき、
                <br />
                ショート動画×「アルゴリズムハック」で、狙った学生層のスマホへピンポイントにリーチ。
              </p>
            </div>
            <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 max-w-[960px] mx-auto">
              {sampleVideos.map((video, index) => (
                <SampleVideoCard
                  key={video.id}
                  videoSrc={video.video_url}
                  thumbnailUrl={video.auto_thumbnail_url ?? video.thumbnail_url}
                  tag={video.tag}
                  duration={video.duration}
                  title={video.title}
                  description={video.description}
                  onOpenModal={openVideoModal}
                  animationDelay={`${index * 0.15}s`}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-6 text-center leading-relaxed">
              *「PRovoke」の「Global Top 250 PR Agency
              Rankings2024」にて、ベクトルグループがアジア1位、世界6位となりました。
              <br />
              ベクトルグループ全体の年間PRプロジェクト実績（2026年時点）
            </p>
            <SectionCTA dark onAnchorClick={handleAnchorClick} />
          </div>
        </section>

        {/* 説明（サービス概要） */}
        <section className={`${styles.sectionPadding} bg-[#f0faff] text-black relative overflow-hidden`} id="solution">
          {/* 背景装飾：右肩上がりの直線で上下を色分け */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(175deg, rgba(240, 250, 255, 0.8) 0%, rgba(240, 250, 255, 0.8) 50%, rgba(255, 245, 250, 0.8) 50%, rgba(255, 245, 250, 0.8) 100%)"
              }}
            />
          </div>
          <div className="relative w-full max-w-[1120px] mx-auto px-5">
            {/* セクションタイトル */}
            <div className="text-left md:text-center mb-12">
              <p className={styles.sectionLabel}>Solution</p>
              <h2 className="text-2xl md:text-[28px] font-semibold text-gray-800 leading-[1.3] mb-3">
                「掲載」をしただけでは企業の魅力が伝わらない時代
              </h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-3xl mx-auto">
                制作から拡散、惹きつけまで。JOBTVが提供する3つの強み。
              </p>
            </div>

            {/* 問題と解決策 */}
            <div className="overflow-x-auto -mx-5 px-5 scrollbar-hide">
              <div className="inline-block min-w-[700px] fade-in-up">
                <div className="space-y-0 border border-gray-200 rounded-[18px] overflow-hidden">
                  {/* デスクトップ版: 表形式 */}
                  {/* ヘッダー行（デスクトップのみ） */}
                  <div className="grid grid-cols-[1fr_64px_1fr] gap-0 bg-gray-50 border-b border-gray-200">
                    <div className="p-5 text-center">
                      <p className="text-base font-semibold text-gray-800">従来の採用</p>
                    </div>
                    <div className="flex items-center justify-center p-4 bg-gray-50 border-l border-r border-gray-200"></div>
                    <div className="p-5 text-center">
                      <p className="text-base font-semibold text-[#ff5f6d]">JOBTVサービス</p>
                    </div>
                  </div>

                  {/* セクション1: 母集団形成の限界 */}
                  <div className="grid grid-cols-[1fr_64px_1fr] gap-0 items-stretch border-b border-gray-200">
                    <div className="bg-white p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-800">母集団形成の限界</h3>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        ナビサイトに数百万円払っても、検索条件で弾かれて学生の目に触れない
                      </p>
                    </div>
                    <div className="flex items-center justify-center p-4 bg-gray-50 border-l border-r border-gray-200">
                      <svg
                        className="w-8 h-8 text-[#ff5f6d]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <div className="bg-[#fddfdd] p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff5f6d] to-[#ff7a53] flex items-center justify-center flex-shrink-0 shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">SNSで新たな母集団を形成</h3>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        TikTokなどのSNSで、まだ貴社を知らない学生のスマホ画面に情報を「強制的に」表示
                      </p>
                    </div>
                  </div>

                  {/* セクション2: 魅力が伝わらない */}
                  <div className="grid grid-cols-[1fr_64px_1fr] gap-0 items-stretch border-b border-gray-200">
                    <div className="bg-white p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-800">自社の魅力が求職者に伝わらない</h3>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        「アットホーム」と書いても信じてもらえない。現場のリアルは求人票では表現できない
                      </p>
                    </div>
                    <div className="flex items-center justify-center p-4 bg-gray-50 border-l border-r border-gray-200">
                      <svg
                        className="w-8 h-8 text-[#ff5f6d]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <div className="bg-[#fddfdd] p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff5f6d] to-[#ff7a53] flex items-center justify-center flex-shrink-0 shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">動画で可視化</h3>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        人の良さ・社風・仕事のリアルを動画で可視化。プロが企画・制作をサポート
                      </p>
                    </div>
                  </div>

                  {/* セクション3: 工数とリソースの限界 */}
                  <div className="grid grid-cols-[1fr_64px_1fr] gap-0 items-stretch">
                    <div className="bg-white p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-800">採用工数・リソース不足</h3>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        企画・撮影・編集できる人がいない。更新が止まった「墓場アカウント」がマイナスに
                      </p>
                    </div>
                    <div className="flex items-center justify-center p-4 bg-gray-50 border-l border-r border-gray-200">
                      <svg
                        className="w-8 h-8 text-[#ff5f6d]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                    <div className="bg-[#fddfdd] p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff5f6d] to-[#ff7a53] flex items-center justify-center flex-shrink-0 shadow-lg">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">ワンストップ支援</h3>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed font-medium">
                        企画から投稿・分析まで一気通貫で支援。リスク管理も万全。エース社員の熱量を動画化
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <SectionCTA onAnchorClick={handleAnchorClick} />
          </div>
        </section>

        {/* できること一覧 */}
        <section className="py-[60px] bg-[#1a1a22]" id="services">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <div className="text-left md:text-center mb-12">
              <p className={styles.sectionLabel}>Services</p>
              <h2 className="text-2xl md:text-[28px] font-semibold leading-[1.3] mb-3">JOBTVが提供するサービス</h2>
              <p className="text-sm md:text-base leading-relaxed max-w-3xl mx-auto">
                採用ブランディングの戦略設計から、制作・運用まで一気通貫でご支援。
                <br />
                必要なポイントだけをご相談いただくことも可能です。
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  tag: "Strategy",
                  title: "採用ブランディング戦略設計",
                  description:
                    "ターゲット定義・ペルソナ設計・競合分析を踏まえた\n採用ブランドコンセプト・メッセージの策定。",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  )
                },
                {
                  tag: "Planning",
                  title: "企画・ストーリー設計",
                  description:
                    "シリーズ構成、1本ごとのテーマ設計、シナリオ作成など、\n候補者視点で「見たくなる」企画づくり。",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  )
                },
                {
                  tag: "Shooting",
                  title: "撮影ディレクション・収録",
                  description: "オフィス・現場・インタビューなど、\nカルチャーが伝わる絵づくりと撮影進行のサポート。",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  )
                },
                {
                  tag: "Editing",
                  title: "ショート動画編集・テロップ制作",
                  description:
                    "SNS文脈に最適化したテンポ感・テロップ・BGMで編集し、\nプラットフォーム別のフォーマットに書き出し。",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  )
                },
                {
                  tag: "SNS Ops",
                  title: "SNS運用・投稿設計",
                  description: "投稿カレンダー作成、文言作成、サムネイル制作など、\n継続的な運用体制の構築を支援。",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  )
                },
                {
                  tag: "Insights",
                  title: "効果測定・レポート",
                  description:
                    "再生数・視聴維持率・応募数などをトラッキングし、\nクリエイティブと打ち手の改善サイクルを回します。",
                  icon: (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  )
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-[18px] border border-white/[0.12] px-3.5 py-3.5 pb-4 bg-gray-800 fade-in-up"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <p className="inline-flex items-center px-2 py-[3px] rounded-full text-[11px] tracking-wide uppercase text-white border border-[rgba(255,160,170,0.7)] mb-3">
                    {item.tag}
                  </p>
                  <h3 className="text-base md:text-lg mb-1.5 font-semibold flex items-center gap-2.5">
                    <span className="text-[#ff5f6d] flex-shrink-0">{item.icon}</span>
                    <span>{item.title}</span>
                  </h3>
                  <p className="text-sm md:text-base text-[#d0d0dd] whitespace-pre-line">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full max-w-[1120px] mx-auto px-5 mt-16">
            <h2 className="text-2xl md:text-[28px] font-semibold mb-8 text-left md:text-center">ご支援フローの例</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-6">
              {/* ステップ1: コンセプト設計 */}
              <div className="bg-[rgba(28,28,38,0.98)] rounded-lg overflow-hidden w-full md:min-w-[180px] border border-white/[0.12]">
                <img
                  src="https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="コンセプト設計"
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="px-6 py-4 text-center">
                  <p className="text-base font-semibold mb-1 text-white">コンセプト設計</p>
                  <p className="text-xs text-[#b8b8c4]">1~2週間</p>
                </div>
              </div>
              {/* 矢印1 */}
              <svg
                className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0 rotate-90 md:rotate-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <defs>
                  <linearGradient id="arrowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff5f6d" />
                    <stop offset="100%" stopColor="#ff7a53" />
                  </linearGradient>
                </defs>
                <path
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                  stroke="url(#arrowGradient1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {/* ステップ2: 撮影 */}
              <div className="bg-[rgba(28,28,38,0.98)] rounded-lg overflow-hidden w-full md:min-w-[180px] border border-white/[0.12]">
                <img
                  src="https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="撮影"
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="px-6 py-4 text-center">
                  <p className="text-base font-semibold mb-1 text-white">撮影</p>
                  <p className="text-xs text-[#b8b8c4]">1~2週間</p>
                </div>
              </div>
              {/* 矢印2 */}
              <svg
                className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0 rotate-90 md:rotate-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <defs>
                  <linearGradient id="arrowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff5f6d" />
                    <stop offset="100%" stopColor="#ff7a53" />
                  </linearGradient>
                </defs>
                <path
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                  stroke="url(#arrowGradient2)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {/* ステップ3: 発信 */}
              <div className="bg-[rgba(28,28,38,0.98)] rounded-lg overflow-hidden w-full md:min-w-[180px] border border-white/[0.12]">
                <img
                  src="https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="発信"
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="px-6 py-4 text-center">
                  <p className="text-base font-semibold mb-1 text-white">発信</p>
                  <p className="text-xs text-[#b8b8c4]">2~3日</p>
                </div>
              </div>
              {/* 矢印3 */}
              <svg
                className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0 rotate-90 md:rotate-0"
                viewBox="0 0 24 24"
                fill="none"
              >
                <defs>
                  <linearGradient id="arrowGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff5f6d" />
                    <stop offset="100%" stopColor="#ff7a53" />
                  </linearGradient>
                </defs>
                <path
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                  stroke="url(#arrowGradient3)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {/* ステップ4: 効果測定 レポート */}
              <div className="bg-[rgba(28,28,38,0.98)] rounded-lg overflow-hidden w-full md:min-w-[180px] border border-white/[0.12]">
                <img
                  src="https://images.pexels.com/photos/1181605/pexels-photo-1181605.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="効果測定 レポート"
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                <div className="px-6 py-4 text-center">
                  <p className="text-base font-semibold mb-1 text-white">効果測定 レポート</p>
                  <p className="text-xs text-[#b8b8c4]">1~2週間</p>
                </div>
              </div>
            </div>
            <p className="text-center text-sm md:text-base text-[#b8b8c4] mt-6">
              *採用マーケティングのプロが、貴社の採用フローに合わせて・カスタマイズして一気通貫でご支援いたします！
            </p>
            <SectionCTA dark onAnchorClick={handleAnchorClick} />
          </div>
        </section>

        {/* FAQ */}
        <section className="py-[60px] bg-[#f0faff] text-black relative overflow-hidden" id="faq">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <SectionTitle label="FAQ" title="よくあるご質問" center />
            <div className="mt-8 grid gap-4 max-w-3xl mx-auto">
              {faqItems.map((item) => (
                <FAQItem
                  key={item.id}
                  question={item.question}
                  answer={
                    <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                      {item.answer.split("\n").map((line, i, arr) => (
                        <Fragment key={i}>
                          {line}
                          {i < arr.length - 1 && <br />}
                        </Fragment>
                      ))}
                    </p>
                  }
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA / お問い合わせ */}
        <section className="py-[60px] border-t border-white/10" id="contact">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <div className="text-left md:text-center">
              <p className={styles.sectionLabel}>Contact</p>
              <h2 className="text-2xl md:text-[28px] font-semibold mb-3">まずは、お気軽にご相談ください。</h2>
              <p className="text-sm md:text-base text-[#b8b8c4] max-w-3xl mx-auto">
                弊社専属の採用コンサルタントが無料オンライン相談を実施いたします。
                <br />
                貴社の現状に合わせた施策イメージをお持ち帰りいただけます。
              </p>
            </div>
            <div className="flex flex-col items-center">
              <SectionCTA dark onAnchorClick={handleAnchorClick} />

              <div className="flex flex-col items-center gap-3 mt-6">
                <p className="text-sm text-[#b8b8c4] text-center">
                  お問い合わせは、お電話またはメールでも承っております。
                </p>
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#b8b8c4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <a
                    href="tel:070-1420-9873"
                    className="text-base md:text-lg font-semibold text-white hover:text-[#ff5f6d] transition-colors"
                  >
                    070-1420-9873
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-[#b8b8c4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <a
                    href="mailto:jobtv-contact@vectorinc.co.jp"
                    className="text-base md:text-lg font-semibold text-white hover:text-[#ff5f6d] transition-colors"
                  >
                    jobtv-contact@vectorinc.co.jp
                  </a>
                </div>
                <p className="text-xs text-[#b8b8c4] text-center mt-1">
                  受付時間：平日 10:00 ～ 18:00（土日・祝日除く）
                </p>
                <p className="text-xs text-[#b8b8c4]/60 text-center">※営業目的のご連絡はお断りしております。</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 動画モーダル（SP版は全画面表示） */}
      {selectedVideoIndex !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black md:bg-black/80 md:backdrop-blur-sm"
          onClick={closeVideoModal}
        >
          <div
            className="relative w-full h-auto max-w-[min(100vw,400px)] max-h-[90dvh] md:max-h-[85vh] mx-auto aspect-[9/16] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 閉じるボタン */}
            <button
              onClick={closeVideoModal}
              className="absolute top-4 right-4 md:-top-12 md:right-0 text-white hover:text-gray-300 transition-colors z-10 w-10 h-10 md:w-8 md:h-8 flex items-center justify-center"
              aria-label="閉じる"
            >
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 左矢印ボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPreviousVideo();
              }}
              className="absolute left-4 md:left-0 top-1/2 -translate-y-1/2 md:-translate-x-12 lg:-translate-x-16 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all group"
              aria-label="前の動画"
            >
              <svg
                className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* 右矢印ボタン */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNextVideo();
              }}
              className="absolute right-4 md:right-0 top-1/2 -translate-y-1/2 md:translate-x-12 lg:translate-x-16 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition-all group"
              aria-label="次の動画"
            >
              <svg
                className="w-6 h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 動画 */}
            <HlsVideo
              key={selectedVideoIndex}
              src={videoList[selectedVideoIndex]}
              hlsSrc={hlsList[selectedVideoIndex]}
              className="w-full h-full object-contain rounded-[18px]"
              controls
              autoPlay
            />
          </div>
        </div>
      )}

      <Footer />

      {/* スクロール追従バナー */}
      {isBannerVisible && scrollBanner && (
        <div
          className={`hidden md:block fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 ${
            showScrollBanner ? "animate-slideInFromRight" : "animate-slideOutToRight"
          }`}
        >
          <a
            href={scrollBanner.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block transition-all duration-300 hover:scale-105"
          >
            <img src={scrollBanner.image_url} alt="" className="w-80 h-auto rounded-md shadow-xl" />
          </a>
        </div>
      )}
    </>
  );
}
