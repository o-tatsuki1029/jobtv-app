"use client";

import { XIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from "@jobtv-app/shared/icons";

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
      hoverColor: "group-hover:text-black dark:group-hover:text-white"
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
    <div className={`flex items-center gap-3 md:gap-4 ${className}`}>
      {icons.map(({ key, href, label, icon: Icon, hoverColor }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 md:p-3 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors border border-gray-600 group"
          aria-label={label}
        >
          <Icon className={`w-4 h-4 md:w-5 md:h-5 text-gray-400 ${hoverColor} transition-colors`} />
        </a>
      ))}
    </div>
  );
}

