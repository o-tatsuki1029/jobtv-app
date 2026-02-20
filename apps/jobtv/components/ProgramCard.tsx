"use client";

import Image from "next/image";

interface ProgramCardProps {
  title: string;
  thumbnail?: string | null;
  channel: string;
  time?: string;
  viewers?: number;
  isLive?: boolean;
  likes?: number;
  vertical?: boolean;
}

export default function ProgramCard({
  title,
  thumbnail,
  channel,
  time,
  viewers,
  isLive = false,
  likes,
  vertical = false
}: ProgramCardProps) {
  return (
    <div className="group cursor-pointer">
      <div
        className={`relative overflow-hidden rounded-lg bg-gray-900 mb-3 shadow-sm group-hover:shadow-lg transition-shadow duration-300 ${
          vertical ? "aspect-[9/16]" : "aspect-video"
        }`}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
        {isLive && (
          <div className="absolute top-2 left-2">
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-md">LIVE</span>
          </div>
        )}
        {viewers && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
              👁 {viewers.toLocaleString()}
            </span>
          </div>
        )}
        {likes && (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              {likes >= 10000 ? `${(likes / 10000).toFixed(1)}万` : likes.toLocaleString()}
            </span>
          </div>
        )}
        {time && !vertical && (
          <div className="absolute bottom-2 left-2">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">{time}</span>
          </div>
        )}
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <svg
            className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity"
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
        <p className="text-xs text-gray-400 mb-1.5 font-medium">{channel}</p>
        <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-red-500 transition-colors leading-snug">
          {title}
        </h3>
      </div>
    </div>
  );
}
