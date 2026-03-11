/**
 * エラーハンドリングのユーティリティ関数
 */

export type ErrorMessage = {
  title: string;
  message: string;
  type: "error" | "warning" | "info";
};

/**
 * Supabaseエラーをユーザーフレンドリーなメッセージに変換
 */
export function formatSupabaseError(error: unknown): ErrorMessage {
  if (!error) {
    return {
      title: "エラー",
      message: "予期しないエラーが発生しました",
      type: "error",
    };
  }

  // エラーメッセージから詳細を抽出
  const errorMessage =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : String(error);
  const errorCode =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: string | number }).code)
      : error && typeof error === "object" && "status" in error
      ? String((error as { status: string | number }).status)
      : undefined;

  // よくあるエラーパターン
  if (errorMessage.includes("duplicate key")) {
    return {
      title: "重複エラー",
      message: "このデータは既に登録されています",
      type: "error",
    };
  }

  if (errorMessage.includes("foreign key")) {
    return {
      title: "関連データエラー",
      message: "関連するデータが存在しないため、操作できません",
      type: "error",
    };
  }

  if (errorMessage.includes("row-level security") || errorCode === "42501") {
    return {
      title: "権限エラー",
      message: "この操作を実行する権限がありません",
      type: "error",
    };
  }

  if (errorCode === "PGRST116") {
    return {
      title: "データが見つかりません",
      message: "指定されたデータが見つかりませんでした",
      type: "warning",
    };
  }

  // デフォルト
  return {
    title: "エラー",
    message: errorMessage || "予期しないエラーが発生しました",
    type: "error",
  };
}

/**
 * エラーメッセージを表示用の文字列に変換
 */
export function getErrorMessage(error: unknown): string {
  const formatted = formatSupabaseError(error);
  return formatted.message;
}


