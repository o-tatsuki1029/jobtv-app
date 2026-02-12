"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  Briefcase,
  FileText,
  Calendar,
} from "lucide-react";

interface MenuCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuCards: MenuCard[] = [
  {
    title: "ダッシュボード",
    description: "システム全体の概要と統計情報を確認",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "企業管理",
    description: "企業情報の登録・編集・管理",
    href: "/admin/companies",
    icon: Building2,
  },
  {
    title: "求職者管理",
    description: "求職者情報の登録・編集・管理",
    href: "/admin/candidates",
    icon: Users,
  },
  {
    title: "求人管理",
    description: "求人情報の登録・編集・管理",
    href: "/admin/jobs",
    icon: Briefcase,
  },
  {
    title: "応募管理",
    description: "応募情報の確認・ステータス管理",
    href: "/admin/applications",
    icon: FileText,
  },
  {
    title: "説明会管理",
    description: "説明会情報の審査・管理",
    href: "/admin/sessions",
    icon: Calendar,
  },
  {
    title: "管理者管理",
    description: "管理者アカウントの管理",
    href: "/admin/managers",
    icon: UserCog,
  },
];

export function AdminMenuCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {menuCards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.href} href={card.href}>
            <Card className="h-full transition-all duration-200 hover:shadow-md hover:bg-accent/20 cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{card.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
