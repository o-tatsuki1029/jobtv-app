"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import Footer from "@/components/Footer";
import "./lp.css";

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
  tag: string;
  duration: string;
  title: string;
  description: string;
  onOpenModal: (src: string) => void;
  animationDelay?: string;
}

function SampleVideoCard({
  videoSrc,
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
        <video src={videoSrc} className="w-full h-full object-cover" muted playsInline preload="metadata" />
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

// セクションタイトルコンポーネント
interface SectionTitleProps {
  label: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  center?: boolean;
}

function SectionTitle({ label, title, description, center = false }: SectionTitleProps) {
  return (
    <div className={center ? "text-center mb-12" : "mb-12"}>
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

export default function LPPage() {
  const [formData, setFormData] = useState({
    company: "",
    name: "",
    email: "",
    message: ""
  });
  const videoList = [
    "/service/recruitment-marketing/images/shorts-sample-01.mp4",
    "/service/recruitment-marketing/images/shorts-sample-02.mp4",
    "/service/recruitment-marketing/images/shorts-sample-03.mp4"
  ];
  const [selectedVideoIndex, setSelectedVideoIndex] = useState<number | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [showScrollBanner, setShowScrollBanner] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [heroVideoIndex, setHeroVideoIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const heroVideoContainerRef = useRef<HTMLDivElement>(null);
  const heroVideoIndexRef = useRef(0);

  // 最初の動画を最後にも追加（シームレスループ用）
  const heroVideoList = [...videoList, videoList[0]];

  // FAQデータ
  const faqItems = [
    {
      question: "既存の採用活動（ナビサイト、説明会など）と併用できますか？",
      answer: (
        <>
          はい、併用可能です。むしろ既存の採用チャネルと連携することで、より効果的な母集団形成が可能になります。
          <br />
          動画で認知を高めた後にナビサイトへ誘導したり、説明会の告知を動画で行うなど、既存施策と組み合わせた戦略設計もサポートします。
        </>
      )
    },
    {
      question: "社内に動画のノウハウがないのですが大丈夫でしょうか？",
      answer: (
        <>
          問題ございません。
          <br />
          企画〜撮影〜編集〜配信設計までワンストップでサポートいたします。
          <br />
          台本作成や出演者へのディレクションも弊社側で行うため、専任担当がいなくても問題ありません。
        </>
      )
    },
    {
      question: "SNSアカウントの運用もお願いできますか？",
      answer: (
        <>
          はい、可能です。既存アカウントの運用代行、新規アカウント立ち上げの双方に対応しています。
          <br />
          月次でレポートと改善提案もご提出します。
        </>
      )
    },
    {
      question: "動画の制作本数や配信頻度はどのくらいですか？",
      answer: (
        <>
          ご予算や目標設定により、最適な更新頻度をご提案いたします。
          <br />
          貴社の採用スケジュールに合わせて柔軟な配信設計が可能です。
        </>
      )
    },
    {
      question: "効果測定や分析はどのように行いますか？",
      answer: (
        <>
          各SNSプラットフォームの分析データをレポート化し、改善提案を行います。
          <br />
          再生数、エンゲージメント率、応募経路の分析など、採用活動に直結する指標を可視化します。
          <br />
          定期的な振り返りミーティングで、施策の効果を確認しながら改善を重ねていきます。
        </>
      )
    },
    {
      question: "開始までのスケジュールを教えてください。",
      answer: (
        <>
          初回のオンライン打ち合わせから最短2週間で初回動画の公開が可能です。
          <br />
          撮影の有無や本数によって変動しますので、まずはご希望のスケジュールをお聞かせください。
        </>
      )
    }
  ];

  // サンプル動画データ
  const sampleVideos = [
    {
      videoSrc: "/service/recruitment-marketing/images/shorts-sample-01.mp4",
      tag: "企業説明",
      duration: "01:13",
      title: "企業研究動画",
      description: "企業や業界の特徴をわかりやすく解説し、ターゲットの志望動機を形成します。"
    },
    {
      videoSrc: "/service/recruitment-marketing/images/shorts-sample-02.mp4",
      tag: "トレンド",
      duration: "00:46",
      title: "トレンドフォーマット",
      description: "媒体トレンドに沿ったフォーマット投稿で、貴社名の露出を最大化します。"
    },
    {
      videoSrc: "/service/recruitment-marketing/images/shorts-sample-03.mp4",
      tag: "社員密着",
      duration: "01:10",
      title: "社員密着",
      description: "実際の職場の雰囲気を表現し、ターゲットに貴社の魅力を伝えます。"
    }
  ];

  // 導入企業ロゴリスト（上段用）
  const companyLogosTop = [
    "産業技術総合研究所.jpg",
    "都城市役所.jpg",
    "阪神グループ.jpg",
    "株式会社電通.jpg",
    "江崎グリコ株式会社.jpg",
    "王子ホールディングス株式会社.jpg",
    "株式会社三井住友銀行.jpg",
    "株式会社明光ネットワークジャパン.jpg",
    "株式会社電算システム.jpg",
    "株式会社マネージビジネス.jpg",
    "株式会社ミクシィ.jpg",
    "株式会社リブ・コンサルティング.jpg",
    "株式会社ホリプロ.jpg",
    "株式会社ポニーキャニオン.jpg",
    "株式会社マイクロアド.jpg",
    "株式会社フルキャストホールディングス.jpg",
    "株式会社ベクトル.jpg",
    "株式会社ハイテックシステムズ.jpg",
    "株式会社ハッチ・ワーク.jpg",
    "株式会社ニューステクノロジー.jpg",
    "株式会社パルコ.jpg",
    "株式会社ケアリッツ・アンド・パートナーズ.jpg",
    "株式会社スギ薬局.jpg",
    "株式会社オープンハウス.jpg",
    "株式会社グランバー東京ラスク.jpg",
    "株式会社アールナイン.jpg",
    "株式会社エフ・コード.jpg",
    "株式会社アルファシステムズ.jpg",
    "株式会社アルプス技研.jpg",
    "株式会社アートリフォーム.jpg",
    "株式会社いえらぶGroup.jpg",
    "株式会社すき家.jpg",
    "株式会社アイドマ・ホールディングス.jpg",
    "株式会社Speee.jpg",
    "株式会社TAKUTO.jpg",
    "株式会社あきんどスシロー.jpg",
    "株式会社PR TIMES.jpg",
    "株式会社Plan･Do･See.jpg",
    "松竹株式会社.jpg",
    "株式会社CIRCUS.jpg"
  ];

  // 導入企業ロゴリスト（下段用）
  const companyLogosBottom = [
    "株式会社NewsTV.jpg",
    "日本郵船株式会社.jpg",
    "東和産業株式会社.jpg",
    "亀田製菓株式会社.jpg",
    "公正取引委員会.jpg",
    "川元建設株式会社.jpg",
    "三井化学株式会社.jpg",
    "三菱自動車工業株式会社.jpg",
    "ロート製薬株式会社.jpg",
    "三井不動産株式会社.jpg",
    "ライク株式会社.jpg",
    "リック株式会社.jpg",
    "マツダ株式会社.jpg",
    "ヤフー株式会社.jpg",
    "ブラザー工業.jpg",
    "ホーユー株式会社.jpg",
    "ヒューマンライフケア株式会社.jpg",
    "ブックオフコーポレーション株式会社.jpg",
    "バリューマネジメント株式会社.jpg",
    "ビットスター株式会社.jpg",
    "セガサミーホールディングス株式会社.jpg",
    "ソフトバンク株式会社.jpg",
    "ダイハツ工業株式会社.jpg",
    "セイコーグループ株式会社.jpg",
    "スズキ株式会社.jpg",
    "スマートキャンプ株式会社.jpg",
    "シチズン時計株式会社.jpg",
    "アマゾンジャパン合同会社.jpg",
    "キリンホールディングス株式会社.jpg",
    "コクヨ株式会社.jpg",
    "みずほリサーチ&テクノロジーズ株式会社.jpg",
    "アイリスオーヤマ株式会社.jpg",
    "KDDI株式会社.jpg",
    "RIZAPグループ株式会社.jpg",
    "GMOアドパートナーズ株式会社.jpg",
    "HRクラウド株式会社.jpg",
    "ENEOS株式会社.jpg",
    "AnyMind Japan株式会社.jpg"
  ];

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

    const elements = document.querySelectorAll(".fade-in-up");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

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

  // ヒーロー動画の自動切り替え（2秒ごと）
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroVideoIndex((prev) => {
        // 最後の動画（最初の動画の2セット目）に到達した場合は、transitionendイベントでリセットされる
        // そのため、ここでは通常通りインデックスを進める
        if (prev < videoList.length) {
          return prev + 1;
        }
        // 既に最後の動画に到達している場合は、そのまま（transitionendでリセットされるまで待つ）
        return prev;
      });
    }, 4000); // 4秒ごとに切り替え

    return () => clearInterval(interval);
  }, [videoList.length]);

  return (
    <>
      <Script src="https://www.tiktok.com/embed.js" strategy="lazyOnload" />
      <header className="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-[10px] bg-[#1a1a22] border-b border-white/8">
        <div className="w-full max-w-[1620px] mx-auto px-5 flex items-center justify-between h-[72px]">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex flex-col items-start">
              <img src="/logo.svg" alt="JOBTV" className="h-6 w-auto mb-1 mx-auto" />
              <p className="text-[10px] md:text-xs text-white leading-tight font-bold">採用特化マーケティング</p>
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
            </a>
            <a
              href="#contact"
              onClick={(e) => handleAnchorClick(e, "#contact")}
              className={`hidden md:inline-flex ${styles.buttonOutline}`}
            >
              資料ダウンロード
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
                  className="inline-flex items-center justify-center gap-1.5 px-[18px] py-3 rounded-full text-sm font-semibold tracking-wide uppercase border border-white/[0.22] text-[#f7f7f7] hover:border-white/50 hover:bg-[rgba(16,16,20,0.9)] transition-all duration-[180ms] ease-out"
                >
                  資料ダウンロード
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
                    href="tel:03-8888-8888"
                    className="text-lg font-semibold text-white hover:text-[#ff5f6d] transition-colors"
                  >
                    03-8888-8888
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
            <img
              src="/service/recruitment-marketing/images/hero-bg-sp.png"
              alt=""
              className="md:hidden w-full h-full object-cover"
              aria-hidden="true"
            />
            <img
              src="/service/recruitment-marketing/images/hero-bg.png"
              alt=""
              className="hidden md:block w-full h-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-white/50"></div>
          </div>
          <div className="relative z-10 w-full max-w-[1120px] mx-auto px-5 grid grid-cols-1 md:grid-cols-[1fr_1fr] lg:grid-cols-[1.1fr_1fr] gap-4 md:gap-0 items-center">
            <div className="order-1 md:order-2 mx-auto text-center md:text-left">
              <h1 className="text-[clamp(32px,4vw,40px)] tracking-[0.02em] leading-[1.2] md:leading-[1.3] mb-[18px] text-gray-800 font-bold">
                <span className="inline-block mb-1.5">就活生に選ばれる</span>
                <br />
                <span className="inline-block">
                  <span className={`${styles.gradientText} text-5xl md:text-6xl`}>採用特化</span>の
                </span>
                <br />
                <span className="inline-block">マーケティング支援</span>
              </h1>
              <p className="text-base md:text-lg text-gray-600 mb-[18px] font-bold text-left">
                国内No.1*のPR集団「ベクトルグループ」が2800社○○業種以上を手掛けたナレッジを活用してショート動画時代の採用活動を一気通貫で支援します。
                *○○調べ
              </p>

              <div className="flex flex-wrap gap-3 mb-4 justify-center md:justify-start">
                <a
                  href="#contact"
                  onClick={(e) => handleAnchorClick(e, "#contact")}
                  className={styles.buttonPrimaryNoShadowLarge}
                >
                  無料で相談・お見積り依頼
                </a>
                <button className={styles.buttonSecondary} type="button">
                  資料ダウンロード
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 gap-x-4 text-[11px] text-gray-600 justify-center md:justify-start">
                <div className="px-2.5 py-1.5 rounded-xl border border-black/8 bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <p className="text-[10px] text-gray-600">応募数</p>
                  <p className={`text-base font-bold ${styles.gradientTextRed}`}>+230%</p>
                </div>
                <div className="px-2.5 py-1.5 rounded-xl border border-black/8 bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <p className="text-[10px] text-gray-600">認知想起</p>
                  <p className={`text-base font-bold ${styles.gradientTextRed}`}>+180%</p>
                </div>
                <span className="text-[10px] text-gray-600">※既存クライアントの施策全体を通じた一例</span>
              </div>
            </div>
            {/* スマホ表示 */}
            <div className="flex order-1 justify-center py-1 hero-screen">
              <div className="relative w-full max-w-[40%] md:max-w-[260px] aspect-[9/16] rounded-[20px] p-1 md:p-2 bg-[#333] shadow-xl rotate-[-2deg] overflow-hidden">
                <div className="absolute inset-[4px] md:inset-[8px] rounded-[16px] overflow-hidden">
                  <div
                    ref={heroVideoContainerRef}
                    className="flex flex-col h-full"
                    style={{
                      transform: `translateY(-${heroVideoIndex * 100}%)`,
                      transition: isTransitioning ? "transform 1000ms ease-in-out" : "none"
                    }}
                  >
                    {heroVideoList.map((videoSrc, index) => (
                      <div key={index} className="w-full h-full flex-shrink-0">
                        <video
                          className="w-full h-full object-cover block"
                          src={videoSrc}
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      </div>
                    ))}
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
                {companyLogosTop.map((logo, index) => (
                  <div
                    key={`logo-top-1-${index}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={`/service/recruitment-marketing/images/logos/${logo}`}
                      alt={logo.replace(".jpg", "")}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                      unoptimized
                    />
                  </div>
                ))}
              </div>
              {/* 2セット目（シームレスループ用） */}
              <div className="flex items-center flex-shrink-0 select-none w-1/2">
                {companyLogosTop.map((logo, index) => (
                  <div
                    key={`logo-top-2-${index}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={`/service/recruitment-marketing/images/logos/${logo}`}
                      alt={logo.replace(".jpg", "")}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
            {/* 下段：左から右へ */}
            <div className="flex animate-scroll-infinite-reverse select-none w-[200%]">
              {/* 1セット目 */}
              <div className="flex items-center flex-shrink-0 select-none w-1/2">
                {companyLogosBottom.map((logo, index) => (
                  <div
                    key={`logo-bottom-1-${index}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={`/service/recruitment-marketing/images/logos/${logo}`}
                      alt={logo.replace(".jpg", "")}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                      unoptimized
                    />
                  </div>
                ))}
              </div>
              {/* 2セット目（シームレスループ用） */}
              <div className="flex items-center flex-shrink-0 select-none w-1/2">
                {companyLogosBottom.map((logo, index) => (
                  <div
                    key={`logo-bottom-2-${index}`}
                    className="flex-shrink-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] flex items-center justify-center p-2 bg-white select-none"
                  >
                    <Image
                      src={`/service/recruitment-marketing/images/logos/${logo}`}
                      alt={logo.replace(".jpg", "")}
                      width={160}
                      height={80}
                      className="w-full h-full object-contain pointer-events-none"
                      draggable={false}
                      unoptimized
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
            <div className="text-center">
              <p className={styles.sectionLabel}>About</p>
              <h2 className="text-2xl md:text-[28px] font-semibold leading-[1.3] mb-4">
                JOBTVの<span className="hero-highlight">採用マーケティング支援</span>とは？
              </h2>
              <p className="text-lg leading-relaxed">
                若手人材が普段から利用するSNS媒体での発信を軸に、
                <br />
                認知拡大から歩留まり改善までを支援する、総合マーケティング支援サービスです。
              </p>
            </div>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-8 items-center">
              {/* 正方形の画像 */}
              <div>
                <img
                  src="/service/recruitment-marketing/images/about.png"
                  alt="JOBTVのマーケティング支援イメージ"
                  loading="lazy"
                  className="block w-full h-full object-cover"
                />
              </div>

              {/* 3つのカード（縦並び、下に行くほど右にずれる） */}
              <div className="space-y-4 relative">
                {/* カード1: 採用ターゲットへの認知強化 */}
                <div
                  className="relative rounded-lg py-4 px-8 bg-gradient-to-br from-[#43afde] to-[#7C3AED] text-white shadow-lg md:mr-16 overflow-hidden fade-in-up"
                  style={{ animationDelay: "0s" }}
                >
                  <span className="absolute bottom-0 right-4 text-[120px] md:text-[150px] font-bold text-white/20 leading-none">
                    1
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
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
                    <ul className="space-y-2 text-base">
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
                  className="relative rounded-lg py-4 px-8 bg-gradient-to-br from-[#43afde] to-[#7C3AED] text-white shadow-lg md:ml-8 md:mr-8 overflow-hidden fade-in-up"
                  style={{ animationDelay: "0.15s" }}
                >
                  <span className="absolute bottom-0 right-4 text-[120px] md:text-[150px] font-bold text-white/20 leading-none">
                    2
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
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
                    <ul className="space-y-2 text-base">
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
                  className="relative rounded-lg py-4 px-8 bg-gradient-to-br from-[#43afde] to-[#7C3AED] text-white shadow-lg md:ml-16 overflow-hidden fade-in-up"
                  style={{ animationDelay: "0.3s" }}
                >
                  <span className="absolute bottom-0 right-4 text-[120px] md:text-[150px] font-bold text-white/20 leading-none">
                    3
                  </span>
                  <div className="relative z-10">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
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
                    <ul className="space-y-2 text-base">
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
          </div>
        </section>

        {/* サンプル */}
        <section className="py-[60px] bg-[#1a1a22]" id="samples">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <div className="text-center">
              <p className={styles.sectionLabel}>Samples</p>
              <h2 className="text-2xl md:text-[28px] font-semibold leading-[1.3] mb-4">
                <span className="hero-highlight">採用ショート動画</span>の制作事例
              </h2>
              <p className="text-lg leading-relaxed">
                ここに説明文を入れる。
                <br />
                ここに説明文を入れる。
              </p>
            </div>
            <div className="mt-[22px] grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 max-w-[960px] mx-auto">
              {sampleVideos.map((video, index) => (
                <SampleVideoCard
                  key={index}
                  videoSrc={video.videoSrc}
                  tag={video.tag}
                  duration={video.duration}
                  title={video.title}
                  description={video.description}
                  onOpenModal={openVideoModal}
                  animationDelay={`${index * 0.15}s`}
                />
              ))}
            </div>
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
            <div className="text-center mb-12">
              <p className={styles.sectionLabel}>Solution</p>
              <h2 className="text-2xl md:text-[28px] font-semibold text-gray-800 leading-[1.3] mb-4">
                「掲載」をしただけでは企業の魅力が伝わらない時代
              </h2>
              <p className="text-base md:text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
                「PR×HR」の力で「毎年の広告費を『資産』に変え、SNSと動画で学生に『攻め』のアプローチを行う。それが、採用マーケティングパートナー『JOBTV』です。」
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
                    <div className="bg-gray-100 p-6">
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
                      <p className="text-base text-gray-700 leading-relaxed">
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
                      <p className="text-base text-gray-800 leading-relaxed font-medium">
                        TikTokなどのSNSで、まだ貴社を知らない学生のスマホ画面に情報を「強制的に」表示
                      </p>
                    </div>
                  </div>

                  {/* セクション2: 魅力が伝わらない */}
                  <div className="grid grid-cols-[1fr_64px_1fr] gap-0 items-stretch border-b border-gray-200">
                    <div className="bg-gray-100 p-6">
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
                      <p className="text-base text-gray-700 leading-relaxed">
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
                      <p className="text-base text-gray-800 leading-relaxed font-medium">
                        人の良さ・社風・仕事のリアルを動画で可視化。プロが企画・制作をサポート
                      </p>
                    </div>
                  </div>

                  {/* セクション3: 工数とリソースの限界 */}
                  <div className="grid grid-cols-[1fr_64px_1fr] gap-0 items-stretch">
                    <div className="bg-gray-100 p-6">
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
                      <p className="text-base text-gray-700 leading-relaxed">
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
                      <p className="text-base text-gray-800 leading-relaxed font-medium">
                        企画から投稿・分析まで一気通貫で支援。リスク管理も万全。エース社員の熱量を動画化
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* できること一覧 */}
        <section className="py-[60px] bg-[#1a1a22]" id="services">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <div className="text-center mb-12">
              <p className={styles.sectionLabel}>Services</p>
              <h2 className="text-2xl md:text-[28px] font-semibold leading-[1.3] mb-4">
                ショート動画起点で、ここまで一気通貫で支援できます
              </h2>
              <p className="text-base md:text-lg leading-relaxed max-w-3xl mx-auto">
                採用ブランディングの戦略設計から、クリエイティブ制作・運用・社内浸透まで。
                <br />
                必要なポイントだけをピックアップしてご相談いただくことも可能です。
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
            <h2 className="text-2xl md:text-[28px] font-semibold mb-8 text-center">ご支援フローの例</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mb-6">
              {/* ステップ1: コンセプト設計 */}
              <div className="bg-[rgba(28,28,38,0.98)] rounded-lg overflow-hidden w-full md:min-w-[180px] border border-white/[0.12]">
                <img
                  src="https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=400"
                  alt="コンセプト設計"
                  className="w-full h-32 object-cover"
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
          </div>
        </section>

        {/* FAQ */}
        <section className="py-[60px] bg-[#f0faff] text-black relative overflow-hidden" id="faq">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <SectionTitle label="FAQ" title="よくあるご質問" center />
            <div className="mt-8 grid gap-4 max-w-3xl mx-auto">
              {faqItems.map((item, index) => (
                <FAQItem key={index} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA / お問い合わせ */}
        <section className="py-[60px] border-t border-white/10" id="contact">
          <div className="w-full max-w-[1120px] mx-auto px-5">
            <div className="text-center mb-12">
              <p className={styles.sectionLabel}>Contact</p>
              <h2 className="text-2xl md:text-[28px] font-semibold mb-4">まずは、お気軽にご相談ください。</h2>
              <p className="text-base md:text-lg text-[#b8b8c4] max-w-3xl mx-auto">
                弊社専属の採用コンサルタントが無料オンライン相談を実施いたします。
                <br />
                貴社の現状に合わせた施策イメージをお持ち帰りいただけます。
              </p>
            </div>
            <div className="flex flex-col items-center gap-6">
              <a
                href="#contact"
                onClick={(e) => handleAnchorClick(e, "#contact")}
                className={styles.buttonPrimaryNoShadowLarge}
              >
                無料で相談・お見積り依頼
              </a>

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#b8b8c4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <a
                    href="tel:03-8888-8888"
                    className="text-lg md:text-xl font-semibold text-white hover:text-[#ff5f6d] transition-colors"
                  >
                    03-8888-8888
                  </a>
                </div>
                <p className="text-sm text-[#b8b8c4] text-center">受付時間：平日 10:00 ～ 18:00（土日・祝日除く）</p>
              </div>
              <p className="text-sm text-center">※お問い合わせは、お電話またはメールにて承っております。</p>
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
            className="relative w-full h-full md:w-auto md:max-w-[400px] md:max-h-[85vh] md:mx-5 md:aspect-[9/16] flex items-center justify-center"
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
            <video
              key={selectedVideoIndex}
              src={videoList[selectedVideoIndex]}
              className="w-full h-full object-contain md:object-contain md:rounded-[18px]"
              controls
              autoPlay
              playsInline
            />
          </div>
        </div>
      )}

      <Footer />

      {/* スクロール追従バナー */}
      {isBannerVisible && (
        <div
          className={`hidden md:block fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 ${
            showScrollBanner ? "animate-slideInFromRight" : "animate-slideOutToRight"
          }`}
        >
          <a
            href="#contact"
            onClick={(e) => handleAnchorClick(e, "#contact")}
            className="block transition-all duration-300 hover:scale-105 "
          >
            <div className="w-80 h-40 rounded-md bg-gray-300 flex items-center justify-center shadow-xl">
              <span className="text-gray-600 font-medium">バナーを入れる</span>
            </div>
          </a>
        </div>
      )}
    </>
  );
}
