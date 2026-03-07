"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

/**
 * 横スクロール用コンテナ。左右矢印で 1 コンテンツずつスナップする。
 * children は「flex のラッパー div」1 つで、その直下の子要素が 1 コンテンツ単位（BannerList / ShortVideoSection 等を想定）。
 */
interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  scrollAmount?: number;
}

export default function HorizontalScrollContainer({
  children,
  className = "",
  scrollAmount = 400
}: HorizontalScrollContainerProps) {
  const { theme } = useMainTheme();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const arrowButtonClass = cn(
    "w-6 md:w-8 min-h-[5rem] flex items-center justify-center rounded-md transition-opacity duration-300",
    theme === "dark"
      ? "bg-gray-700 hover:bg-gray-600"
      : "bg-black/90 hover:bg-black/95"
  );

  /** スクロール位置から左右矢印の表示可否を更新。端は 1px 以上余っていればスクロール可能とみなす。 */
  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollLeft(container.scrollLeft > 1);
    setCanScrollRight(container.scrollLeft < maxScrollLeft - 1);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollability();
    container.addEventListener("scroll", checkScrollability);
    window.addEventListener("resize", checkScrollability);

    return () => {
      container.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [children]);

  /**
   * 矢印クリック時: 次の/前の 1 コンテンツの左端がスクロールコンテナ（要素）の左端に合う位置へスクロール（スナップ）。
   * アイテムが無い場合は scrollAmount で固定量スクロール。
   * 位置は getBoundingClientRect でコンテナ要素基準の内容座標に変換して使用（offsetLeft は offsetParent に依存するためビューポートずれの原因になる）。
   */
  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const inner = container.firstElementChild as HTMLElement | null;
    const items = inner ? (Array.from(inner.children) as HTMLElement[]) : [];

    if (items.length === 0) {
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
      return;
    }

    const scrollLeft = container.scrollLeft;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    const containerLeft = container.getBoundingClientRect().left;

    /** 各アイテムの左端を「スクロールコンテナの内容」座標に変換（ビューポートに依存しない）。 */
    const itemLefts = items.map((el) => el.getBoundingClientRect().left - containerLeft + scrollLeft);

    /** 現在「どのアイテムにいるか」: コンテナの見えている左端より左に左端があるアイテムのうち最も右のもの。 */
    let currentIndex = 0;
    for (let i = 0; i < itemLefts.length; i++) {
      if (itemLefts[i] <= scrollLeft) currentIndex = i;
    }

    /** 左矢印なら 1 つ前、右矢印なら 1 つ次のインデックス（端でクランプ）。 */
    const targetIndex =
      direction === "left" ? Math.max(0, currentIndex - 1) : Math.min(items.length - 1, currentIndex + 1);
    /** そのアイテムの左端をコンテナ左端に合わせる（要素基準）。0〜maxScrollLeft にクランプ。 */
    const targetLeft = Math.max(0, Math.min(maxScrollLeft, targetIndex === 0 ? 0 : itemLefts[targetIndex]));

    container.scrollTo({
      left: targetLeft,
      behavior: "smooth"
    });
  };

  return (
    <div className={`flex items-center min-w-0 min-h-[5rem] ${className}`}>
      {/* 左矢印 - SP 非表示、MD 以上でスロット確保 */}
      <div className="hidden md:flex flex-shrink-0 w-8 mr-2 items-center justify-center">
        <button
          onClick={() => scroll("left")}
          className={cn(
            arrowButtonClass,
            canScrollLeft ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label="左にスクロール"
          tabIndex={canScrollLeft ? 0 : -1}
        >
          <svg
            className="w-8 h-8 text-white flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* スクロールコンテナ（SP では全幅） */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-w-0 overflow-x-auto hide-scrollbar transition-all duration-300"
      >
        {children}
      </div>

      {/* 右矢印 - SP 非表示、MD 以上でスロット確保 */}
      <div className="hidden md:flex flex-shrink-0 w-8 ml-2 items-center justify-center">
        <button
          onClick={() => scroll("right")}
          className={cn(
            arrowButtonClass,
            canScrollRight ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          aria-label="右にスクロール"
          tabIndex={canScrollRight ? 0 : -1}
        >
          <svg
            className="w-8 h-8 text-white flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
