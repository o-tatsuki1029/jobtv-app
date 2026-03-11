"use client";

import Image from "next/image";
import HorizontalScrollContainer from "./HorizontalScrollContainer";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";
import { HORIZONTAL_CARD_ASPECT_RATIO_16_9_CLASS, HORIZONTAL_CARD_WIDTH } from "@/constants/card-layout";

interface Banner {
  id: string;
  title: string;
  image: string;
  link?: string;
}

interface BannerListProps {
  banners: Banner[];
}

export default function BannerList({ banners }: BannerListProps) {
  const { classes } = useMainTheme();

  return (
    <div className="md:mx-4">
      <HorizontalScrollContainer scrollAmount={500}>
        <div className="flex gap-5 py-6 pl-4 md:pl-0">
          {banners.map((banner) => (
            <a key={banner.id} href={banner.link || "#"} className="flex-shrink-0 group">
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl shadow-md group-hover:shadow-xl transition-shadow duration-300",
                  HORIZONTAL_CARD_ASPECT_RATIO_16_9_CLASS,
                  HORIZONTAL_CARD_WIDTH.banner,
                  classes.videoThumbPlaceholder
                )}
              >
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  sizes="(max-width: 640px) 250px, (max-width: 768px) 300px, 350px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300 origin-center"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 drop-shadow-lg">
                    {banner.title}
                  </h3>
                </div>
              </div>
            </a>
          ))}
        </div>
      </HorizontalScrollContainer>
    </div>
  );
}
