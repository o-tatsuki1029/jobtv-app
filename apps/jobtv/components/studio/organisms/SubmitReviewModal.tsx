"use client";

import React, { useState } from "react";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";
import StudioButton from "../atoms/StudioButton";

interface SubmitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (keepProductionActive: boolean) => void;
  isSubmitting: boolean;
  hasProduction: boolean;
}

/**
 * 審査申請確認モーダル
 * 審査申請前に、公開設定と注意事項を確認するモーダル
 */
export default function SubmitReviewModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  hasProduction
}: SubmitReviewModalProps) {
  const [keepProductionActive, setKeepProductionActive] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = () => {
    onSubmit(keepProductionActive);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 relative">
        {/* ローディングオーバーレイ */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/95 rounded-2xl flex items-center justify-center z-10">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-bold text-gray-900">審査申請中...</p>
                <p className="text-sm text-gray-600">しばらくお待ちください</p>
              </div>
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-black text-gray-900">審査申請の確認</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="閉じる"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* 審査についての案内 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-900 mb-2">審査について</p>
              <ul className="text-xs text-blue-700 space-y-1 font-medium">
                <li>• 審査担当により承認されるまで、変更内容は公開されません</li>
                <li>• 審査中は内容の編集ができなくなります</li>
              </ul>
            </div>
          </div>

          {/* 公開設定の選択（既存の公開ページがある場合のみ） */}
          {hasProduction && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">審査中の公開設定</label>
              <p className="text-xs text-gray-600 mt-1">
                公開設定は審査中でも変更可能です。非公開にした場合は、再度手動で公開設定が必要になります。
                <br />
                審査完了後に以前のバージョンの復元はできません
              </p>
              <div className="space-y-2">
                {/* 公開したままにする */}
                <button
                  onClick={() => setKeepProductionActive(true)}
                  disabled={isSubmitting}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all text-left
                    ${
                      keepProductionActive
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                      ${keepProductionActive ? "border-green-500 bg-green-500" : "border-gray-300 bg-white"}
                    `}
                    >
                      {keepProductionActive && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">以前のバージョンを公開したままにする（推奨）</p>
                      <p className="text-xs text-gray-600 mt-1">
                        審査中も現在公開中のページが表示され続けます。承認後、自動的に新しいバージョンに切り替わります。
                      </p>
                    </div>
                  </div>
                </button>

                {/* 非公開にする */}
                <button
                  onClick={() => setKeepProductionActive(false)}
                  disabled={isSubmitting}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all text-left
                    ${
                      !keepProductionActive
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                      ${!keepProductionActive ? "border-amber-500 bg-amber-500" : "border-gray-300 bg-white"}
                    `}
                    >
                      {!keepProductionActive && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">審査中は非公開にする</p>
                      <p className="text-xs text-gray-600 mt-1">
                        審査申請と同時に現在公開中のページを非公開にします。承認後に再度公開設定が必要です。
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <StudioButton variant="outline" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </StudioButton>
          <StudioButton variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "申請中..." : "審査を申請する"}
          </StudioButton>
        </div>
      </div>
    </div>
  );
}
