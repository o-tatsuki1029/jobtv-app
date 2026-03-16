/**
 * 会員登録フォーム用バリデーション関数
 * signup/page.tsx と event/entry 両方から利用する
 */

import {
  EMAIL_REGEX,
  EMAIL_ALLOWED_REGEX,
  PHONE_LENGTH_MIN,
  PHONE_LENGTH_MAX,
  PHONE_REGEX,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  KANA_REGEX,
} from "@/constants/signup-options";

export function validateEmail(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!EMAIL_ALLOWED_REGEX.test(v)) {
    return "メールアドレスに使用できない文字が含まれています。英数字と . _ % + - @ のみ使用できます。";
  }
  return EMAIL_REGEX.test(v) ? null : "正しい形式のメールアドレスを入力してください";
}

export function validatePhone(value: string): string | null {
  const v = value.replace(/\s/g, "");
  if (!v) return null;
  if (v.length < PHONE_LENGTH_MIN || v.length > PHONE_LENGTH_MAX)
    return "10桁または11桁の数字で入力してください";
  return PHONE_REGEX.test(v) ? null : "数字のみで入力してください（ハイフンなし）";
}

export function validatePassword(value: string): string | null {
  if (!value) return null;
  if (value.length < PASSWORD_MIN_LENGTH) return "8文字以上で入力してください";
  return PASSWORD_REGEX.test(value) ? null : "英字と数字の両方を含めてください";
}

export function validateKana(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return KANA_REGEX.test(v) ? null : "カタカナで入力してください";
}
