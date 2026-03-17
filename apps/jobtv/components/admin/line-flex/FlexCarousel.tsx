"use client";

import { useRef } from "react";
import type { LineFlexCarousel } from "@/types/line-flex.types";
import { FlexBubble } from "./FlexBubble";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function FlexCarousel({ carousel }: { carousel: LineFlexCarousel }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 260;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="group relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        {carousel.contents.map((bubble, i) => (
          <div key={i} className="snap-start flex-shrink-0">
            <FlexBubble bubble={bubble} />
          </div>
        ))}
      </div>
      {carousel.contents.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 shadow opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
