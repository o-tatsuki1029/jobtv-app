"use client";

import React from "react";
import { VIDEO_CATEGORIES } from "../../../types/video.types";
import type { VideoCategory } from "../../../types/video.types";

interface VideoCategoryTabsProps {
  activeCategory: VideoCategory;
  onCategoryChange: (category: VideoCategory) => void;
  counts: Record<VideoCategory, number>;
}

export default function VideoCategoryTabs({ activeCategory, onCategoryChange, counts }: VideoCategoryTabsProps) {
  return (
    <div className="w-fit bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {/* カテゴリータブ */}
        {VIDEO_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`flex-shrink-0 px-6 py-4 text-sm font-bold transition-colors border-b-2 ${
              activeCategory === category.id
                ? "bg-blue-600 text-white border-blue-600"
                : "text-blue-600 hover:bg-blue-50 border-transparent"
            }`}
          >
            {category.label}
            <span
              className={`ml-2 px-2 py-0.5 rounded text-xs ${
                activeCategory === category.id ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
              }`}
            >
              {counts[category.id] || 0}
              {category.maxCount && ` / ${category.maxCount}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

