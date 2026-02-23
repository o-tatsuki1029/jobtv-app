"use client";

import { XIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "@jobtv-app/shared/icons";
import { useMainTheme } from "@/components/theme/PageThemeContext";
import { cn } from "@jobtv-app/shared/utils/cn";

interface CompanySnsIconsProps {
  snsUrls?: {
    x?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
  currentPageUrl?: string;
  className?: string;
}

export default function CompanySnsIcons({ snsUrls, currentPageUrl, className = "" }: CompanySnsIconsProps) {
  const { classes } = useMainTheme();
  // URLが設定されているアイコンのみを表示
  const icons = [];

  if (snsUrls?.tiktok) {
    icons.push({
      key: "tiktok",
      href: snsUrls.tiktok,
      label: "TikTok",
      icon: TikTokIcon,
      hoverColor: "group-hover:text-black"
    });
  }

  if (snsUrls?.instagram) {
    icons.push({
      key: "instagram",
      href: snsUrls.instagram,
      label: "Instagram",
      icon: InstagramIcon,
      hoverColor: "group-hover:text-pink-500"
    });
  }

  if (snsUrls?.x) {
    // Xの場合は直接URLを使用（設定されているURLに遷移）
    icons.push({
      key: "x",
      href: snsUrls.x,
      label: "X",
      icon: XIcon,
      hoverColor: "group-hover:text-black"
    });
  }

  if (snsUrls?.youtube) {
    icons.push({
      key: "youtube",
      href: snsUrls.youtube,
      label: "YouTube",
      icon: YouTubeIcon,
      hoverColor: "group-hover:text-red-600"
    });
  }

  if (icons.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3 md:gap-4", className)}>
      {icons.map(({ key, href, label, icon: Icon, hoverColor }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("p-2.5 md:p-3 rounded-md transition-colors group", classes.snsButtonBg, classes.snsButtonBorder, "hover:opacity-90")}
          aria-label={label}
        >
          <Icon className={cn("w-4 h-4 md:w-5 md:h-5", classes.snsIcon, hoverColor, "transition-colors")} />
        </a>
      ))}
    </div>
  );
}

