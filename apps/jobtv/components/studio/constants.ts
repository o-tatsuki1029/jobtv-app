import { LayoutDashboard, Building, Video, Users, Briefcase, Calendar, Settings, Shield, CheckCircle } from "lucide-react";

export const STUDIO_NAVIGATION = [
  { name: "ダッシュボード", href: "/studio", icon: LayoutDashboard },
  { name: "企業ページ管理", href: "/studio/company", icon: Building },
  { name: "求人管理", href: "/studio/jobs", icon: Briefcase },
  { name: "説明会管理", href: "/studio/sessions", icon: Calendar },
  { name: "動画管理", href: "/studio/videos", icon: Video },
  { name: "候補者管理", href: "/studio/candidates", icon: Users },
  { name: "設定", href: "/studio/settings", icon: Settings }
];

export const ADMIN_NAVIGATION = [
  { name: "ダッシュボード", href: "/admin", icon: LayoutDashboard },
  { name: "審査管理", href: "/admin/review", icon: CheckCircle }
];
