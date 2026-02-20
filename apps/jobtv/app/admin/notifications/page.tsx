"use client";

import React, { useState, useEffect } from "react";
import { Bell, Plus, Trash2, CheckCircle2, AlertCircle, Info, Calendar, Edit } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";
import StudioBadge from "@/components/studio/atoms/StudioBadge";
import LoadingSpinner from "@/components/studio/atoms/LoadingSpinner";
import ErrorMessage from "@/components/studio/atoms/ErrorMessage";
import StudioSelect from "@/components/studio/atoms/StudioSelect";
import StudioFormField from "@/components/studio/molecules/StudioFormField";
import {
  getAllNotificationsForAdmin,
  deleteNotification,
  createNotification,
  updateNotification
} from "@/lib/actions/notification-actions";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { X } from "lucide-react";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  target_company_id: string | null;
  created_at: string;
  companies?: {
    name: string;
  } | null;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新規/編集お知らせフォーム
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    type: "info",
    targetCompanyId: ""
  });

  const loadNotifications = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getAllNotificationsForAdmin();
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

  const handleOpenCreateModal = () => {
    setNotificationForm({ title: "", message: "", type: "info", targetCompanyId: "" });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (notification: NotificationData) => {
    setSelectedNotificationId(notification.id);
    setNotificationForm({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      targetCompanyId: notification.target_company_id || ""
    });
    setIsEditModalOpen(true);
  };

  const handleCreateNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      setError("タイトルと内容は必須です");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: createError } = await createNotification(
      notificationForm.title,
      notificationForm.message,
      notificationForm.type,
      notificationForm.targetCompanyId || null
    );

    if (createError) {
      setError(createError);
      setIsSubmitting(false);
      return;
    }

    // 成功したらモーダルを閉じてリロード
    setIsCreateModalOpen(false);
    setNotificationForm({ title: "", message: "", type: "info", targetCompanyId: "" });
    setIsSubmitting(false);
    await loadNotifications();
  };

  const handleUpdateNotification = async () => {
    if (!selectedNotificationId || !notificationForm.title || !notificationForm.message) {
      setError("タイトルと内容は必須です");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: updateError } = await updateNotification(
      selectedNotificationId,
      notificationForm.title,
      notificationForm.message,
      notificationForm.type,
      notificationForm.targetCompanyId || null
    );

    if (updateError) {
      setError(updateError);
      setIsSubmitting(false);
      return;
    }

    // 成功したらモーダルを閉じてリロード
    setIsEditModalOpen(false);
    setSelectedNotificationId(null);
    setNotificationForm({ title: "", message: "", type: "info", targetCompanyId: "" });
    setIsSubmitting(false);
    await loadNotifications();
  };

  const handleDeleteNotification = async () => {
    if (!selectedNotificationId) return;

    setIsSubmitting(true);
    setError(null);

    const { error: deleteError } = await deleteNotification(selectedNotificationId);

    if (deleteError) {
      setError(deleteError);
      setIsSubmitting(false);
      return;
    }

    // 成功したらモーダルを閉じてリロード
    setIsDeleteModalOpen(false);
    setSelectedNotificationId(null);
    setIsSubmitting(false);
    await loadNotifications();
  };

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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "success":
        return "成功";
      case "warning":
        return "警告";
      case "system":
        return "システム";
      default:
        return "情報";
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
            お知らせ管理
          </h1>
          <p className="text-gray-500 font-medium">企業向けのお知らせを作成・管理できます。</p>
        </div>
        <StudioButton icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreateModal}>
          新規お知らせを作成
        </StudioButton>
      </div>

      {/* お知らせテーブル */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider font-bold text-gray-500">
                <th className="px-6 py-4">種別</th>
                <th className="px-6 py-4">タイトル</th>
                <th className="px-6 py-4">内容</th>
                <th className="px-6 py-4">対象</th>
                <th className="px-6 py-4">作成日時</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>お知らせはありません</p>
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">{getNotificationIcon(notification.type)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{notification.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-600 leading-relaxed line-clamp-2">{notification.message}</p>
                    </td>
                    <td className="px-6 py-4">
                      {notification.target_company_id ? (
                        <StudioBadge variant="info">{notification.companies?.name || "特定企業"}</StudioBadge>
                      ) : (
                        <StudioBadge variant="neutral">全企業</StudioBadge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ja })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <StudioButton
                          variant="outline"
                          size="sm"
                          icon={<Edit className="w-4 h-4" />}
                          onClick={() => handleOpenEditModal(notification)}
                        >
                          編集
                        </StudioButton>
                        <StudioButton
                          variant="outline"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={() => {
                            setSelectedNotificationId(notification.id);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          削除
                        </StudioButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 件数表示 */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-center pt-4">
          <p className="text-sm text-gray-500">全{notifications.length}件のお知らせ</p>
        </div>
      )}

      {/* 新規作成モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200" onClick={() => !isSubmitting && setIsCreateModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">新規お知らせを作成</h2>
              <p className="text-sm text-gray-600">企業向けのお知らせを作成します。</p>
            </div>

            <div className="p-8 space-y-6">
              <StudioFormField
                label="タイトル"
                name="title"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                placeholder="お知らせのタイトルを入力"
                required
                disabled={isSubmitting}
              />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">内容</label>
                <textarea
                  name="message"
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder="お知らせの内容を入力"
                  required
                  rows={6}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">種別</label>
                <StudioSelect
                  name="type"
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                  disabled={isSubmitting}
                >
                  <option value="info">情報</option>
                  <option value="success">成功</option>
                  <option value="warning">警告</option>
                  <option value="system">システム</option>
                </StudioSelect>
              </div>

              <StudioFormField
                label="対象企業ID（オプション）"
                name="targetCompanyId"
                value={notificationForm.targetCompanyId}
                onChange={(e) => setNotificationForm({ ...notificationForm, targetCompanyId: e.target.value })}
                placeholder="空欄の場合は全企業に配信"
                disabled={isSubmitting}
              />
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isSubmitting}>
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleCreateNotification} disabled={isSubmitting}>
                {isSubmitting ? "作成中..." : "作成"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200" onClick={() => !isSubmitting && setIsEditModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
              className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="p-8 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">お知らせを編集</h2>
              <p className="text-sm text-gray-600">お知らせの内容を編集します。</p>
            </div>

            <div className="p-8 space-y-6">
              <StudioFormField
                label="タイトル"
                name="title"
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                placeholder="お知らせのタイトルを入力"
                required
                disabled={isSubmitting}
              />

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">内容</label>
                <textarea
                  name="message"
                  value={notificationForm.message}
                  onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                  placeholder="お知らせの内容を入力"
                  required
                  rows={6}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">種別</label>
                <StudioSelect
                  name="type"
                  value={notificationForm.type}
                  onChange={(e) => setNotificationForm({ ...notificationForm, type: e.target.value })}
                  disabled={isSubmitting}
                >
                  <option value="info">情報</option>
                  <option value="success">成功</option>
                  <option value="warning">警告</option>
                  <option value="system">システム</option>
                </StudioSelect>
              </div>

              <StudioFormField
                label="対象企業ID（オプション）"
                name="targetCompanyId"
                value={notificationForm.targetCompanyId}
                onChange={(e) => setNotificationForm({ ...notificationForm, targetCompanyId: e.target.value })}
                placeholder="空欄の場合は全企業に配信"
                disabled={isSubmitting}
              />
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleUpdateNotification} disabled={isSubmitting}>
                {isSubmitting ? "更新中..." : "更新"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200" onClick={() => !isSubmitting && setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">お知らせを削除</h2>
              <p className="text-sm text-gray-600">このお知らせを削除してもよろしいですか？この操作は取り消せません。</p>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <StudioButton variant="outline" onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting}>
                キャンセル
              </StudioButton>
              <StudioButton variant="primary" onClick={handleDeleteNotification} disabled={isSubmitting}>
                {isSubmitting ? "削除中..." : "削除"}
              </StudioButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

