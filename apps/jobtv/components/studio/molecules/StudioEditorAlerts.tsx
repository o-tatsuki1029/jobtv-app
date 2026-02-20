"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface StudioEditorAlertsProps {
  showUnderReviewAlert: boolean;
  showOlderVersionAlert: boolean;
}

/**
 * 編集画面上部に表示される警告メッセージを共通化
 */
export default function StudioEditorAlerts({ showUnderReviewAlert, showOlderVersionAlert }: StudioEditorAlertsProps) {
  if (!showUnderReviewAlert && !showOlderVersionAlert) return null;

  return (
    <div className="space-y-3 mb-6">
      {/* 以前のバージョンが公開中メッセージ */}
      {showOlderVersionAlert && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-black text-blue-900">以前のバージョンが公開されています</p>
            <p className="text-xs text-blue-700 mt-1 font-medium">
              現在編集中の内容はまだ本番サイトには反映されていません。変更を反映するには、審査を申請し、承認される必要があります。
            </p>
          </div>
        </div>
      )}

      {/* 審査中メッセージ */}
      {showUnderReviewAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-black text-amber-900">審査中のため編集できません</p>
            <p className="text-xs text-amber-700 mt-1 font-medium">
              現在審査中のため、情報の変更や保存はできません。審査が完了するまでお待ちください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
