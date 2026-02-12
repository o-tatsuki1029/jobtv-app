import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * 未保存の変更がある場合の離脱時のアラートを管理するカスタムフック
 * @param hasChanges - 変更があるかどうかを判定する関数
 * @param options - オプション設定
 * @returns 離脱確認用のハンドラー関数
 */
export function useUnsavedChanges(
  hasChanges: () => boolean,
  options?: {
    /** ブラウザの離脱時に警告を表示するか（デフォルト: true） */
    enableBeforeUnload?: boolean;
    /** カスタム確認メッセージ（デフォルト: "変更が保存されていません。このまま戻りますか？"） */
    confirmMessage?: string;
  }
) {
  const router = useRouter();
  const { enableBeforeUnload = true, confirmMessage = "変更が保存されていません。このまま戻りますか？" } = options || {};
  
  // hasChanges関数の最新の参照を保持
  const hasChangesRef = useRef(hasChanges);
  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  // ブラウザの離脱時の警告（タブを閉じる、ページをリロードするなど）
  useEffect(() => {
    if (!enableBeforeUnload) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChangesRef.current()) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enableBeforeUnload]);

  /**
   * プログラム的な離脱時の確認（戻るボタンなど）
   * @param path - 遷移先のパス（指定しない場合は現在のパスから戻る）
   * @returns 離脱が許可された場合true、キャンセルされた場合false
   */
  const handleNavigation = useCallback((path?: string): boolean => {
    if (hasChangesRef.current()) {
      if (!confirm(confirmMessage)) {
        return false;
      }
    }
    if (path) {
      router.push(path);
    } else {
      router.back();
    }
    return true;
  }, [router, confirmMessage]);

  return {
    handleNavigation
  };
}

