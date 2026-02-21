"use client";

import React, { useState } from "react";
import {
  Building2,
  Briefcase,
  Calendar,
  Users,
  ChevronRight,
  Bell,
  Settings,
  ExternalLink,
  LayoutDashboard,
  Globe,
  Menu
} from "lucide-react";
import Link from "next/link";
import {
  getNotifications,
  markNotificationAsRead,
  type NotificationWithReadStatus
} from "@/lib/actions/notification-actions";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import NotificationDetailModal from "@/components/studio/organisms/NotificationDetailModal";

interface InitialCompany {
  id: string;
  name: string | null;
  logo_url: string | null;
}

interface StudioDashboardClientProps {
  initialCompany: InitialCompany | null;
  initialNotifications: NotificationWithReadStatus[];
}

export default function StudioDashboardClient({
  initialCompany,
  initialNotifications
}: StudioDashboardClientProps) {
  const [notifications, setNotifications] = useState<NotificationWithReadStatus[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<{
    title: string;
    message: string;
    type: string;
    time: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadNotifications = async () => {
    const { data } = await getNotifications();
    setNotifications(data || []);
  };

  const handleNotificationClick = async (notification: NotificationWithReadStatus) => {
    setSelectedNotification({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      time: formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ja })
    });
    setIsModalOpen(true);

    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      await loadNotifications();
    }
  };

  const menuItems = [
    {
      title: "企業ページ",
      description: "企業情報とプロフィールを管理",
      icon: Building2,
      href: "/studio/company",
      color: "bg-blue-500"
    },
    {
      title: "求人管理",
      description: "求人情報の作成と編集",
      icon: Briefcase,
      href: "/studio/jobs",
      color: "bg-green-500"
    },
    {
      title: "説明会・インターン",
      description: "説明会とインターンシップの管理",
      icon: Calendar,
      href: "/studio/sessions",
      color: "bg-purple-500"
    },
    {
      title: "候補者管理",
      description: "応募者と予約者の確認",
      icon: Users,
      href: "/studio/candidates",
      color: "bg-orange-500"
    },
    {
      title: "設定",
      description: "アカウントとシステム設定",
      icon: Settings,
      href: "/studio/settings",
      color: "bg-gray-500"
    }
  ];

  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="w-8 h-8 text-gray-900" />
          <h1 className="text-3xl font-black tracking-tight">ダッシュボード</h1>
        </div>
        <p className="text-gray-500 font-medium">JOBTV Studioへようこそ</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* 公開ページ（サーバーで取得済み・最初から表示） */}
          {initialCompany && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-bold text-gray-900">公開ページ</h2>
              </div>
              <a
                href={`/company/${initialCompany.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-gray-300 transition-all group cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {initialCompany.logo_url ? (
                        <img
                          src={initialCompany.logo_url}
                          alt={initialCompany.name || "企業ロゴ"}
                          className="w-16 h-16 rounded-lg object-contain border border-gray-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                          {initialCompany.name?.charAt(0) || "企"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">企業ページを開く</h3>
                        <ExternalLink className="w-5 h-5 text-blue-600" />
                      </div>
                      {initialCompany.name && (
                        <p className="text-sm text-gray-600 truncate">{initialCompany.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">メニュー</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md hover:border-gray-300 transition-all group cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center text-white`}
                    >
                      <item.icon className="w-6 h-6" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">お知らせ</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">お知らせはありません</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {notifications.slice(0, 4).map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group relative"
                    >
                      {!notification.is_read && (
                        <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                      <h3 className="text-sm font-bold text-gray-900 mb-1 pr-4">{notification.title}</h3>
                      <p className="text-xs text-gray-600 mb-2 leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ja
                        })}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100">
                  <Link href="/studio/notifications">
                    <button className="w-full text-xs font-bold text-gray-500 py-1.5 hover:text-black transition-colors">
                      すべてのお知らせを見る
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <NotificationDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notification={selectedNotification}
      />
    </div>
  );
}
