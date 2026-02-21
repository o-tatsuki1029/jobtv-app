"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertCircle, Info, Calendar } from "lucide-react";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import StudioButton from "@/components/studio/atoms/StudioButton";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import NotificationDetailModal from "@/components/studio/organisms/NotificationDetailModal";
import { getNotifications, markNotificationAsRead, type NotificationWithReadStatus } from "@/lib/actions/notification-actions";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [notifications, setNotifications] = useState<NotificationWithReadStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<{
    title: string;
    message: string;
    type: string;
    time: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getNotifications();
    if (fetchError) {
      setError(fetchError);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleNotificationClick = async (notification: NotificationWithReadStatus) => {
    // モーダルを開く
    setSelectedNotification({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      time: formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ja })
    });
    setIsModalOpen(true);

    // 未読の場合は既読にする
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      // データを再取得
      await loadNotifications();
    }
  };

  const filteredNotifications = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "system":
        return <Calendar className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-10">
      <ErrorMessage message={error || ""} />

      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Bell className="w-8 h-8" />
            お知らせ
          </h1>
          <p className="text-gray-500 font-medium">システムからの通知と重要なお知らせを確認できます。</p>
        </div>
        {unreadCount > 0 && <StudioBadge variant="error">{unreadCount}件の未読</StudioBadge>}
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-3">
        <StudioButton variant={filter === "all" ? "primary" : "outline"} size="sm" onClick={() => setFilter("all")}>
          すべて ({notifications.length})
        </StudioButton>
        <StudioButton
          variant={filter === "unread" ? "primary" : "outline"}
          size="sm"
          onClick={() => setFilter("unread")}
        >
          未読のみ ({unreadCount})
        </StudioButton>
      </div>

      {/* お知らせテーブル */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4">種別</th>
                <th className="px-6 py-4">タイトル</th>
                <th className="px-6 py-4">内容</th>
                <th className="px-6 py-4">日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>お知らせはありません</p>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((notification) => (
                  <tr
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.is_read ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      {!notification.is_read && <div className="w-2.5 h-2.5 bg-red-500 rounded-full mx-auto" />}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">{getNotificationIcon(notification.type)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{notification.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 leading-relaxed line-clamp-2">{notification.message}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ja })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 件数表示 */}
      {filteredNotifications.length > 0 && (
        <div className="flex items-center justify-center pt-4">
          <p className="text-sm text-gray-500">全{filteredNotifications.length}件のお知らせを表示中</p>
        </div>
      )}

      {/* お知らせ詳細モーダル */}
      <NotificationDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        notification={selectedNotification}
      />
    </div>
  );
}

