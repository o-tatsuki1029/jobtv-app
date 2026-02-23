"use client";

import Image from "next/image";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_ASPECT_RATIO_CLASS } from "@/constants/card-layout";

interface ShortVideoCardProps {
  title: string;
  thumbnail?: string | null;
  channel: string;
  duration?: string;
  onClick?: () => void;
}

export default function ShortVideoCard({ title, thumbnail, channel, duration, onClick }: ShortVideoCardProps) {
  const { classes } = useMainTheme();
  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <div className={cn("relative overflow-hidden rounded-lg bg-gray-900 mb-3 shadow-sm group-hover:shadow-lg transition-shadow duration-300", HORIZONTAL_CARD_ASPECT_RATIO_CLASS)}>
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300 origin-center"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <svg
              className="w-12 h-12 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {duration && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-1 bg-black/80 text-white text-xs font-semibold rounded backdrop-blur-sm">
              {duration}
            </span>
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <svg
            className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
      <div className="px-1">
        <h3 className={cn("text-sm font-semibold line-clamp-2 group-hover:text-red-500 transition-colors mb-1.5 leading-snug", classes.textPrimary)}>
          {title}
        </h3>
        <div className={cn("text-xs font-medium", classes.textMuted)}>
          <span>{channel}</span>
        </div>
      </div>
    </div>
  );
}
