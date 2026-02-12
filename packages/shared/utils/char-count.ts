/**
 * 文字数カウント関連のユーティリティ関数
 */

/**
 * 文字数カウントのテキストを生成
 * @param currentLength - 現在の文字数
 * @param maxLength - 最大文字数（オプション）
 * @returns 文字数カウントのテキスト（例: "10 / 100文字" または "10文字"）
 */
export function getCharCountText(
  currentLength: number,
  maxLength?: number
): string {
  if (maxLength) {
    return `${currentLength} / ${maxLength}文字`;
  }
  return `${currentLength}文字`;
}

/**
 * 文字数カウントの警告レベルを判定
 * @param currentLength - 現在の文字数
 * @param maxLength - 最大文字数（オプション）
 * @returns 警告レベル: "error" | "warning" | "normal"
 */
export function getCharCountLevel(
  currentLength: number,
  maxLength?: number
): "error" | "warning" | "normal" {
  if (!maxLength) {
    return "normal";
  }
  if (currentLength > maxLength) {
    return "error";
  }
  if (currentLength > maxLength * 0.9) {
    return "warning";
  }
  return "normal";
}

/**
 * 文字数カウントのスタイルクラスを取得
 * @param currentLength - 現在の文字数
 * @param maxLength - 最大文字数（オプション）
 * @returns Tailwind CSSクラス名
 */
export function getCharCountClassName(
  currentLength: number,
  maxLength?: number
): string {
  const level = getCharCountLevel(currentLength, maxLength);
  switch (level) {
    case "error":
      return "text-red-500";
    case "warning":
      return "text-yellow-500";
    case "normal":
    default:
      return "text-gray-400";
  }
}
