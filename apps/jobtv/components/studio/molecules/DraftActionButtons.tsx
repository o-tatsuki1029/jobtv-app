/**
 * ドラフト編集ページ用の共通アクションボタンコンポーネント
 * プレビュー、審査申請ボタンを統一
 */

"use client";

import React from "react";
import { Eye, Send, Loader2, ExternalLink } from "lucide-react";
import StudioButton from "@/components/studio/atoms/StudioButton";

export interface DraftActionButtonsProps {
  /**
   * プレビューを開く処理
   */
  onPreview?: () => void;
  /**
   * 審査申請処理
   */
  onSubmitForReview: () => void | Promise<any>;
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
   * 審査申請ボタンのラベル
   */
  submitLabel?: string;
  /**
   * 変更があるかどうか（変更がない場合はボタンを無効化）
   */
  hasChanges?: boolean;
  /**
   * 実際のページを開く処理（公開中の場合のみ表示）
   */
  onViewActualPage?: () => void;
  /**
   * 実際のページを表示するかどうか
   */
  showActualPageButton?: boolean;
  /**
   * プレビューボタンを表示するかどうか
   */
  showPreviewButton?: boolean;
}

export default function DraftActionButtons({
  onPreview,
  onSubmitForReview,
  isSubmitting = false,
  isSubmitDisabled = false,
  showSubmitButton = true,
  submitLabel = "審査申請",
  hasChanges = true,
  onViewActualPage,
  showActualPageButton = false,
  showPreviewButton = false
}: DraftActionButtonsProps) {
  // 変更がない場合はボタンを無効化
  const isDisabled = isSubmitting || isSubmitDisabled || !hasChanges;

  return (
    <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-4 shadow-lg z-10">
      {showActualPageButton && onViewActualPage && (
        <StudioButton variant="outline" icon={<ExternalLink className="w-4 h-4" />} onClick={onViewActualPage}>
          実際のページを見る
        </StudioButton>
      )}
      {showPreviewButton && onPreview && (
        <StudioButton variant="outline" icon={<Eye className="w-4 h-4" />} onClick={onPreview}>
          プレビュー
        </StudioButton>
      )}
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
