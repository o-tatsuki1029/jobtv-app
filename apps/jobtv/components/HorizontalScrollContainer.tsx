"use client";

import { useRef, useState, useEffect, ReactNode } from "react";

interface HorizontalScrollContainerProps {
  children: ReactNode;
  className?: string;
  scrollAmount?: number;
  ignoreParentPadding?: boolean;
}

export default function HorizontalScrollContainer({
  children,
  className = "",
  scrollAmount = 400,
  ignoreParentPadding = false
}: HorizontalScrollContainerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);

      const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
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

  const scroll = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
  };

  return (
    <div className={`relative ${ignoreParentPadding ? "-mx-4 md:-mx-0" : ""} ${className}`}>
      {/* 左矢印 - 縦型バー */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-6 md:w-8 z-20 transition-all duration-300 ${
          canScrollLeft ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/90" />
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 w-full flex items-center justify-center hover:bg-black/95 transition-colors"
          aria-label="左にスクロール"
        >
          <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* スクロールコンテナ */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto px-0 hide-scrollbar transition-all duration-300"
        style={{
          paddingLeft: canScrollLeft ? (isMobile ? "1.5rem" : "2rem") : "0",
          paddingRight: canScrollRight ? (isMobile ? "1.5rem" : "2rem") : "0"
        }}
      >
        {children}
      </div>

      {/* 右矢印 - 縦型バー */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-6 md:w-8 z-20 transition-all duration-300 ${
          canScrollRight ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-black/90" />
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 w-full flex items-center justify-center hover:bg-black/95 transition-colors"
          aria-label="右にスクロール"
        >
          <svg className="w-6 h-6 md:w-8 md:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
