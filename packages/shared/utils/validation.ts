/**
 * フォームバリデーション共通ユーティリティ
 */

/**
 * メールアドレスのバリデーション
 * @param email - バリデーション対象のメールアドレス
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return "メールアドレスを入力してください";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "有効なメールアドレスを入力してください";
  }
  return null;
}

/**
 * パスワードのバリデーション
 * @param password - バリデーション対象のパスワード
 * @param minLength - 最小文字数（デフォルト: 6）
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validatePassword(
  password: string,
  minLength: number = 6
): string | null {
  if (!password) {
    return "パスワードを入力してください";
  }
  if (password.length < minLength) {
    return `パスワードは${minLength}文字以上で入力してください`;
  }
  return null;
}

/**
 * パスワード確認のバリデーション
 * @param password - パスワード
 * @param confirmPassword - 確認用パスワード
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validatePasswordConfirm(
  password: string,
  confirmPassword: string
): string | null {
  if (!confirmPassword) {
    return "パスワード（確認）を入力してください";
  }
  if (password !== confirmPassword) {
    return "パスワードが一致しません";
  }
  return null;
}

/**
 * 必須入力のバリデーション
 * @param value - バリデーション対象の値
 * @param fieldName - フィールド名（エラーメッセージに使用）
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validateRequired(
  value: string | undefined | null,
  fieldName: string = "この項目"
): string | null {
  if (!value || !value.trim()) {
    return `${fieldName}を入力してください`;
  }
  return null;
}

/**
 * 電話番号のバリデーション（日本の電話番号形式）
 * @param phone - バリデーション対象の電話番号
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validatePhone(phone: string): string | null {
  if (!phone.trim()) {
    return "電話番号を入力してください";
  }
  // ハイフンあり/なし両方に対応
  const phoneRegex = /^0\d{9,10}$|^0\d{1,4}-\d{1,4}-\d{4}$/;
  if (!phoneRegex.test(phone)) {
    return "有効な電話番号を入力してください";
  }
  return null;
}

/**
 * URL形式のバリデーション
 * @param url - バリデーション対象のURL
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validateUrl(url: string): string | null {
  if (!url.trim()) {
    return "URLを入力してください";
  }
  try {
    new URL(url);
    return null;
  } catch {
    return "有効なURLを入力してください";
  }
}


