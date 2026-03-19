"use client";

import BannerList from "@/components/BannerList";
import { useMainTheme } from "@/components/theme/PageThemeContext";

interface Props {
  banners: Array<{ id: string; title: string; image: string; link?: string }>;
}

export default function BannerSectionClient({ banners }: Props) {
  const { classes } = useMainTheme();
  return (
    <div className={classes.bannerListBg}>
      <BannerList banners={banners} />
    </div>
  );
}
