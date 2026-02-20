/**
 * 審査申請の共通ロジック
 * 企業ページ、求人、説明会、企業プロフィールで使用
 *
 * このフックは、ドラフトテーブルのdraft_statusを"submitted"に変更する処理を共通化します。
 * 審査中の判定は、ドラフトテーブルのdraft_statusを参照してください。
 * 本番テーブルのstatusには"pending"は存在しません（"active"または"closed"のみ）。
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export interface SubmitForReviewOptions {
  /**
   * 保存処理（審査申請前に実行）
   * draftIdを返す場合は、そのIDを使用して審査申請を行う
   */
  onSave?: () => Promise<{ error?: string | null; draftId?: string | null }>;
  /**
   * 審査申請処理
   * draft_statusを"submitted"に変更するServer Actionを呼び出す
   */
  onSubmit: (draftId: string, keepProductionActive?: boolean) => Promise<{ data: any; error: string | null }>;
  /**
   * バリデーション関数（エラーがある場合はエラーメッセージを返す）
   */
  validate?: () => string | null;
  /**
   * 審査申請成功後のリダイレクト先（オプション）
   */
  redirectTo?: string;
  /**
   * 審査申請成功後のコールバック
   */
  onSuccess?: () => void | Promise<void>;
}

export function useDraftSubmit(options: SubmitForReviewOptions) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitForReview = useCallback(
    async (draftId: string | null | undefined, keepProductionActive?: boolean) => {
      // バリデーション
      if (options.validate) {
        const validationError = options.validate();
        if (validationError) {
          setError(validationError);
          return { success: false, error: validationError };
        }
      }

      setIsSubmitting(true);
      setError(null);
      setSuccess(false);

      try {
        // まず保存処理を実行（オプション）
        let finalDraftId = draftId;
        if (options.onSave) {
          const saveResult = await options.onSave();
          if (saveResult.error) {
            setError(saveResult.error);
            setIsSubmitting(false);
            return { success: false, error: saveResult.error };
          }
          // onSaveでdraftIdが返された場合はそれを使用
          if (saveResult.draftId) {
            finalDraftId = saveResult.draftId;
          }
        }

        // draftIdがまだ存在しない場合はエラー
        if (!finalDraftId) {
          setError("ドラフトが見つかりません。");
          setIsSubmitting(false);
          return { success: false, error: "ドラフトが見つかりません。" };
        }

        // 審査申請（draft_statusを"submitted"に変更）
        const result = await options.onSubmit(finalDraftId, keepProductionActive);
        if (result.error) {
          setError(result.error);
          setIsSubmitting(false);
          return { success: false, error: result.error };
        }

        setSuccess(true);
        setError(null);
        setIsSubmitting(false);

        // 成功後の処理
        if (options.onSuccess) {
          await options.onSuccess();
        }

        // リダイレクトまたはリロード
        if (options.redirectTo) {
          router.push(options.redirectTo);
        } else {
          // 強制的にリロードして最新状態を表示
          window.location.reload();
        }

        return { success: true, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "審査申請に失敗しました";
        setError(errorMessage);
        setIsSubmitting(false);
        return { success: false, error: errorMessage };
      }
    },
    [options, router]
  );

  return {
    submitForReview,
    isSubmitting,
    error,
    success,
    setError
  };
}
