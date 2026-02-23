import {
  LayoutDashboard,
  Building,
  Video,
  Users,
  Briefcase,
  Calendar,
  Settings,
  Shield,
  CheckCircle,
  Bell,
  // MessageSquare, // チャット用（後々追加）
  UserCog
} from "lucide-react";

export const STUDIO_NAVIGATION = [
  { name: "ダッシュボード", href: "/studio", icon: LayoutDashboard },
  { name: "お知らせ", href: "/studio/notifications", icon: Bell },
  { name: "候補者管理", href: "/studio/candidates", icon: Users },
  // { name: "チャット", href: "/studio/chat", icon: MessageSquare }, // 後々追加
  { name: "企業ページ管理", href: "/studio/company", icon: Building },
  { name: "求人管理", href: "/studio/jobs", icon: Briefcase },
  { name: "説明会・インターン管理", href: "/studio/sessions", icon: Calendar },
  { name: "動画管理", href: "/studio/videos", icon: Video }
];

/** サイドメニュー用：セクション付き。sectionLabel があるブロックは小さい見出しで表示する */
export const STUDIO_NAVIGATION_SECTIONS: {
  sectionLabel?: string;
  items: (typeof STUDIO_NAVIGATION)[number][];
}[] = [
  {
    items: [
      { name: "ダッシュボード", href: "/studio", icon: LayoutDashboard },
      { name: "お知らせ", href: "/studio/notifications", icon: Bell }
    ]
  },
  {
    sectionLabel: "応募管理",
    items: [{ name: "候補者管理", href: "/studio/candidates", icon: Users }]
  },
  {
    sectionLabel: "掲載管理",
    items: [
      { name: "企業ページ管理", href: "/studio/company", icon: Building },
      { name: "求人管理", href: "/studio/jobs", icon: Briefcase },
      { name: "説明会・インターン管理", href: "/studio/sessions", icon: Calendar },
      { name: "動画管理", href: "/studio/videos", icon: Video }
    ]
  }
];

export const STUDIO_BOTTOM_NAVIGATION = [{ name: "設定", href: "/studio/settings/user", icon: Settings }];

export const ADMIN_NAVIGATION = [
  { name: "ダッシュボード", href: "/admin", icon: LayoutDashboard },
  { name: "審査管理", href: "/admin/review", icon: CheckCircle },
  { name: "お知らせ管理", href: "/admin/notifications", icon: Bell },
  { name: "企業アカウント管理", href: "/admin/company-accounts", icon: Building }
];

export const ADMIN_BOTTOM_NAVIGATION = [{ name: "設定", href: "/admin/settings/user", icon: Settings }];
