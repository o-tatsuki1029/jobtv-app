"use client";

import React, { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, Calendar, X } from "lucide-react";
import StudioButton from "../atoms/StudioButton";

interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: {
    title: string;
    message: string;
    type: string;
    time: string;
  } | null;
}

export default function NotificationDetailModal({
  isOpen,
  onClose,
  notification
}: NotificationDetailModalProps) {
  // Escキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // 背景スクロールを防止
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !notification) return null;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-8 h-8 text-green-500" />;
      case "warning":
        return <AlertCircle className="w-8 h-8 text-orange-500" />;
      case "system":
        return <Calendar className="w-8 h-8 text-blue-500" />;
      default:
        return <Info className="w-8 h-8 text-gray-500" />;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div className="absolute inset-0 bg-black/80 animate-in fade-in duration-200" onClick={onClose} />

      {/* モーダルコンテンツ */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-lg hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* ヘッダー */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
            <div className="flex-1 pr-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{notification.title}</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {getTypeLabel(notification.type)}
                </span>
                <span className="text-xs text-gray-400 font-medium">{notification.time}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 本文 */}
        <div className="p-8">
          <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <StudioButton variant="primary" onClick={onClose}>
            閉じる
          </StudioButton>
        </div>
      </div>
    </div>
  );
}

