"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@jobtv-app/shared/utils/cn";

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  showMore?: boolean;
  showBorder?: boolean;
  borderClassName?: string;
  className?: string;
  titleClassName?: string;
}

export default function SectionHeader({
  icon: Icon,
  title,
  showMore = false,
  showBorder = false,
  borderClassName,
  className,
  titleClassName
}: SectionHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Icon className={cn("w-8 h-8 shrink-0", titleClassName)} strokeWidth={2} />
          <h2 className={cn("text-2xl md:text-3xl font-bold", titleClassName)}>{title}</h2>
        </div>
        {showMore && (
          <a
            href="#"
            className="text-red-500 hover:text-red-400 text-sm font-semibold transition-colors flex items-center gap-1 group"
          >
            もっと見る
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}
      </div>
      {showBorder && <div className={cn("border-b", borderClassName)} />}
    </div>
  );
}
