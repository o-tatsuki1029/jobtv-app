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

/**
 * 文字数制限のバリデーション
 * @param value - バリデーション対象の値
 * @param maxLength - 最大文字数
 * @param fieldName - フィールド名（エラーメッセージに使用）
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string = "この項目"
): string | null {
  if (value.length > maxLength) {
    return `${fieldName}は${maxLength}文字以内で入力してください`;
  }
  return null;
}

/**
 * 文字数範囲のバリデーション
 * @param value - バリデーション対象の値
 * @param minLength - 最小文字数
 * @param maxLength - 最大文字数
 * @param fieldName - フィールド名（エラーメッセージに使用）
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validateLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string = "この項目"
): string | null {
  if (value.length < minLength) {
    return `${fieldName}は${minLength}文字以上で入力してください`;
  }
  if (value.length > maxLength) {
    return `${fieldName}は${maxLength}文字以内で入力してください`;
  }
  return null;
}

/**
 * 必須入力と文字数制限のバリデーション（組み合わせ）
 * @param value - バリデーション対象の値
 * @param maxLength - 最大文字数（オプション）
 * @param fieldName - フィールド名（エラーメッセージに使用）
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validateRequiredWithMaxLength(
  value: string | undefined | null,
  maxLength?: number,
  fieldName: string = "この項目"
): string | null {
  const requiredError = validateRequired(value, fieldName);
  if (requiredError) {
    return requiredError;
  }
  if (maxLength && value) {
    return validateMaxLength(value, maxLength, fieldName);
  }
  return null;
}

/**
 * URL形式のバリデーション（http://またはhttps://で始まることを確認）
 * @param url - バリデーション対象のURL
 * @param fieldName - フィールド名（エラーメッセージに使用）
 * @returns エラーメッセージ（正常な場合はnull）
 */
export function validateUrlWithProtocol(url: string, fieldName: string = "URL"): string | null {
  if (!url.trim()) {
    return `${fieldName}を入力してください`;
  }
  const urlPattern = /^https?:\/\/.+/;
  if (!urlPattern.test(url.trim())) {
    return `${fieldName}は「https://」または「http://」で始まるURL形式で入力してください`;
  }
  return null;
}
