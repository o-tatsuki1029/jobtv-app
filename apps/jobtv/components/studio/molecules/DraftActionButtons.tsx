/**
 * ドラフト編集ページ用の共通アクションボタンコンポーネント
 * プレビュー、審査申請ボタンを統一
 */

"use client";

import React from "react";
import { Eye, ExternalLink, Send, Loader2 } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

export interface DraftActionButtonsProps {
  /**
   * プレビューを開く処理
   */
  onPreview: () => void;
  /**
   * 審査申請処理
   */
  onSubmitForReview: () => void | Promise<void>;
  /**
   * 審査申請中かどうか
   */
  isSubmitting?: boolean;
  /**
   * 審査申請ボタンを無効化するかどうか
   */
  isSubmitDisabled?: boolean;
  /**
   * 審査申請ボタンを表示するかどうか
   */
  showSubmitButton?: boolean;
  /**
   * 実際のページのURL（オプション）
   */
  publicPageUrl?: string;
  /**
   * 審査申請ボタンのラベル
   */
  submitLabel?: string;
  /**
   * 変更があるかどうか（変更がない場合はボタンを無効化）
   */
  hasChanges?: boolean;
}

export default function DraftActionButtons({
  onPreview,
  onSubmitForReview,
  isSubmitting = false,
  isSubmitDisabled = false,
  showSubmitButton = true,
  publicPageUrl,
  submitLabel = "審査申請",
  hasChanges = true
}: DraftActionButtonsProps) {
  // 変更がない場合はボタンを無効化
  const isDisabled = isSubmitting || isSubmitDisabled || !hasChanges;

  return (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-4 shadow-lg z-10">
      {publicPageUrl && (
        <StudioButton
          variant="outline"
          icon={<ExternalLink className="w-4 h-4" />}
          onClick={() => window.open(publicPageUrl, "_blank")}
        >
          実際のページを見る
        </StudioButton>
      )}
      <StudioButton variant="outline" icon={<Eye className="w-4 h-4" />} onClick={onPreview}>
        プレビュー
      </StudioButton>
      {showSubmitButton && (
        <StudioButton
          variant="primary"
          icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          onClick={onSubmitForReview}
          disabled={isDisabled}
        >
          {isSubmitting ? "申請中..." : submitLabel}
        </StudioButton>
      )}
    </div>
  );
}

