"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDraftSubmit } from "./useDraftSubmit";
import { useFormState } from "./useFormState";

export interface StudioEditorOptions<T> {
  type: "job" | "session" | "company_page" | "company_info";
  id: string;
  data: T | null;
  onSave: () => Promise<{ error?: string | null; draftId?: string | null }>;
  onSubmit: (draftId: string, keepProductionActive?: boolean) => Promise<{ data: any; error: string | null }>;
  onToggleStatus: (id: string, newStatus: "active" | "closed") => Promise<{ data: any; error: string | null }>;
  validate?: () => string | null;
  redirectTo?: string;
  onSuccess?: () => void | Promise<void>;
}

/**
 * スタジオ編集画面の共通ロジックを管理するカスタムフック
 */
export function useStudioEditor<
  T extends {
    id: string;
    draft_status?: string;
    production_status?: string;
    production_id?: string | null;
  }
>(options: StudioEditorOptions<T>) {
  const router = useRouter();
  const isNew = options.id === "new";
  const {
    loading,
    setLoading,
    saving,
    setSaving,
    error: formError,
    setError: setFormError,
    fieldErrors,
    setFieldErrors,
    clearAllErrors
  } = useFormState();

  const {
    submitForReview,
    isSubmitting: isSubmittingReview,
    error: submitError,
    success: submitSuccess
  } = useDraftSubmit({
    onSave: options.onSave,
    onSubmit: options.onSubmit,
    validate: options.validate,
    redirectTo: options.redirectTo,
    onSuccess: options.onSuccess
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const draftStatus = options.data?.draft_status;
  const productionStatus = options.data?.production_status;
  const hasProduction = !!options.data?.production_id;

  // 審査ステータス判定
  const isSubmitted = draftStatus === "submitted";
  const isApproved = draftStatus === "approved";
  const isRejected = draftStatus === "rejected";
  const isDraft = draftStatus === "draft" || !draftStatus;

  // 編集制限（審査中は読み取り専用）
  const isReadOnly = isSubmitted;

  // アラート表示判定
  const showUnderReviewAlert = isSubmitted;
  const showOlderVersionAlert = useMemo(() => {
    // 審査中（submitted）の場合は、本番ページが公開されている場合のみ表示
    // draft、rejected、approvedの場合は、本番ページが公開されていれば表示
    return !isNew && hasProduction && draftStatus !== "approved" && productionStatus === "active";
  }, [isNew, hasProduction, draftStatus, productionStatus]);

  // 公開ステータストグル
  const handleToggleStatus = useCallback(async () => {
    if (!options.data?.id || !hasProduction) return;

    const currentStatus = productionStatus || "closed";
    const newStatus = currentStatus === "active" ? "closed" : "active";
    const statusText = newStatus === "active" ? "公開" : "非公開";

    if (!window.confirm(`公開設定を「${statusText}」に変更しますか？`)) {
      return;
    }

    setSaving(true);
    try {
      // 本番テーブルのID（production_id）が必要だが、アクション側で対応しているためoptions.data.idを渡す
      const result = await options.onToggleStatus(options.data.id, newStatus);
      if (result.error) {
        setFormError(result.error);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setFormError("ステータスの変更に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [options, hasProduction, productionStatus, setFormError, setSaving]);

  return {
    // 状態管理
    loading,
    setLoading,
    saving,
    setSaving,
    error: formError || submitError,
    setError: setFormError,
    fieldErrors,
    setFieldErrors,
    clearAllErrors,
    isSubmittingReview,
    submitSuccess,

    // プレビュー管理
    isPreviewOpen,
    setIsPreviewOpen,
    previewDevice,
    setPreviewDevice,

    // ステータス判定
    isNew,
    isReadOnly,
    isSubmitted,
    isApproved,
    isRejected,
    isDraft,
    draftStatus,
    productionStatus,
    hasProduction,

    // アラート表示フラグ
    showUnderReviewAlert,
    showOlderVersionAlert,

    // アクション
    handleToggleStatus,
    submitForReview: (keepProductionActive?: boolean) => submitForReview(options.data?.id, keepProductionActive),

    // モーダル制御
    isSubmitModalOpen,
    setIsSubmitModalOpen
  };
}
