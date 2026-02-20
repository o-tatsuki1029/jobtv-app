"use client";

import React from "react";
import StudioBadge from "../atoms/StudioBadge";

interface StudioEditorStatusSectionProps {
  draftStatus?: string | null;
  productionStatus?: "active" | "closed" | null;
  onToggleStatus: () => void;
  hasProduction: boolean;
  disabled?: boolean;
  showToggle?: boolean;
}

/**
 * 編集画面上部のステータス管理セクション
 * デザインを元に戻し、ヘッダー右側に配置可能な形式に変更
 */
export default function StudioEditorStatusSection({
  draftStatus,
  productionStatus,
  onToggleStatus,
  hasProduction,
  disabled = false,
  showToggle = true
}: StudioEditorStatusSectionProps) {
  // 審査ステータス表示の変換
  const getDraftStatusInfo = (status?: string | null) => {
    switch (status) {
      case "submitted":
        return { label: "審査中", variant: "neutral" as const };
      case "approved":
        return { label: "承認済み", variant: "success" as const };
      case "rejected":
        return { label: "却下", variant: "error" as const };
      default:
        return { label: "下書き", variant: "neutral" as const };
    }
  };

  const draftInfo = getDraftStatusInfo(draftStatus);

  return (
    <div className="flex items-center gap-4">
      {/* 審査ステータス（ラベル＋バッジ、ボックスの外側） */}
      {draftStatus && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">審査ステータス:</span>
          <StudioBadge variant={draftInfo.variant}>{draftInfo.label}</StudioBadge>
        </div>
      )}

      {/* 公開設定トグル（白いボックス内） */}
      {showToggle && hasProduction && (
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
          <button
            onClick={onToggleStatus}
            className={`
              relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
              ${productionStatus === "active" ? "bg-green-500 focus:ring-green-500" : "bg-gray-300 focus:ring-gray-400"}
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-sm active:scale-95"}
            `}
            disabled={disabled}
          >
            <span className="sr-only">公開状態を切り替える</span>
            <span
              className={`
                inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out
                ${productionStatus === "active" ? "translate-x-6" : "translate-x-1"}
              `}
            />
          </button>
          <span
            className={`text-sm font-semibold min-w-[3rem] ${
              productionStatus === "active" ? "text-green-600" : "text-gray-500"
            }`}
          >
            {productionStatus === "active" ? "公開中" : "非公開"}
          </span>
        </div>
      )}
    </div>
  );
}
