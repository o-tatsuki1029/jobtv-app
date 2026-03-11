"use client";

import Image from "next/image";
import Link from "next/link";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_ASPECT_RATIO_CLASS } from "@/constants/card-layout";

interface CompanyCardProps {
  id: string;
  name: string;
  /** トップページ企業カード用サムネ。未設定時は logoUrl を表示 */
  thumbnailUrl?: string | null;
  logoUrl?: string | null;
}

export default function CompanyCard({ id, name, thumbnailUrl, logoUrl }: CompanyCardProps) {
  const { classes } = useMainTheme();
  const imageUrl = thumbnailUrl ?? logoUrl;

  return (
    <Link href={`/company/${id}`} className="group cursor-pointer block">
      <div className={cn("relative overflow-hidden rounded-lg bg-gray-900 mb-3 shadow-sm group-hover:shadow-lg transition-shadow duration-300", HORIZONTAL_CARD_ASPECT_RATIO_CLASS)}>
        {imageUrl ? (
          <div className="absolute inset-0">
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 768px) 120px, (max-width: 1200px) 140px, 160px"
              className="object-cover group-hover:scale-105 transition-transform duration-300 origin-center"
              loading="lazy"
            />
          </div>
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        )}
        {/* ホバー時「もっと見る」を下部に表示 */}
        <div className="absolute inset-x-0 bottom-0 py-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center">
          <span className="text-white text-xs font-bold">もっと見る</span>
        </div>
      </div>
      <div className="px-1">
        <h3 className={cn("text-sm font-semibold line-clamp-2 group-hover:text-red-500 transition-colors leading-snug", classes.textPrimary)}>
          {name}
        </h3>
      </div>
    </Link>
  );
}

