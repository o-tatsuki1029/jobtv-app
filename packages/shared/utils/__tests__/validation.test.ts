import { describe, it, expect } from "vitest";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  validateRequired,
  validatePhone,
  validateUrl,
  validateMaxLength,
  validateLength,
  validateRequiredWithMaxLength,
  validateUrlWithProtocol,
  validateKatakana,
} from "../validation";

describe("validateEmail", () => {
  it("空文字はエラー", () => {
    expect(validateEmail("")).toBe("メールアドレスを入力してください");
    expect(validateEmail("   ")).toBe("メールアドレスを入力してください");
  });

  it("有効なメールアドレスはnullを返す", () => {
    expect(validateEmail("user@example.com")).toBeNull();
    expect(validateEmail("user+tag@example.co.jp")).toBeNull();
  });

  it("無効なメールアドレスはエラー", () => {
    expect(validateEmail("not-an-email")).toBe("有効なメールアドレスを入力してください");
    expect(validateEmail("missing@")).toBe("有効なメールアドレスを入力してください");
    expect(validateEmail("@nodomain.com")).toBe("有効なメールアドレスを入力してください");
  });
});

describe("validatePassword", () => {
  it("空文字はエラー", () => {
    expect(validatePassword("")).toBe("パスワードを入力してください");
  });

  it("最小文字数未満はエラー", () => {
    expect(validatePassword("abc", 6)).toBe("パスワードは6文字以上で入力してください");
    expect(validatePassword("ab", 8)).toBe("パスワードは8文字以上で入力してください");
  });

  it("最小文字数以上はnullを返す", () => {
    expect(validatePassword("abcdef", 6)).toBeNull();
    expect(validatePassword("abcdefgh", 8)).toBeNull();
  });

  it("デフォルト最小文字数は6", () => {
    expect(validatePassword("abcde")).toBe("パスワードは6文字以上で入力してください");
    expect(validatePassword("abcdef")).toBeNull();
  });
});

describe("validatePasswordConfirm", () => {
  it("空文字はエラー", () => {
    expect(validatePasswordConfirm("pass", "")).toBe("パスワード（確認）を入力してください");
  });

  it("不一致はエラー", () => {
    expect(validatePasswordConfirm("pass1", "pass2")).toBe("パスワードが一致しません");
  });

  it("一致する場合はnullを返す", () => {
    expect(validatePasswordConfirm("password", "password")).toBeNull();
  });
});

describe("validateRequired", () => {
  it("空値はエラー", () => {
    expect(validateRequired("")).toBe("この項目を入力してください");
    expect(validateRequired(null)).toBe("この項目を入力してください");
    expect(validateRequired(undefined)).toBe("この項目を入力してください");
    expect(validateRequired("   ")).toBe("この項目を入力してください");
  });

  it("値があればnullを返す", () => {
    expect(validateRequired("value")).toBeNull();
  });

  it("フィールド名が使われる", () => {
    expect(validateRequired("", "会社名")).toBe("会社名を入力してください");
  });
});

describe("validatePhone", () => {
  it("空文字はエラー", () => {
    expect(validatePhone("")).toBe("電話番号を入力してください");
    expect(validatePhone("   ")).toBe("電話番号を入力してください");
  });

  it("有効な電話番号はnullを返す", () => {
    expect(validatePhone("09012345678")).toBeNull();
    expect(validatePhone("0312345678")).toBeNull();
    expect(validatePhone("03-1234-5678")).toBeNull();
    expect(validatePhone("090-1234-5678")).toBeNull();
  });

  it("無効な電話番号はエラー", () => {
    expect(validatePhone("1234567890")).toBe("有効な電話番号を入力してください");
    expect(validatePhone("abc")).toBe("有効な電話番号を入力してください");
  });
});

describe("validateUrl", () => {
  it("空文字はエラー", () => {
    expect(validateUrl("")).toBe("URLを入力してください");
    expect(validateUrl("   ")).toBe("URLを入力してください");
  });

  it("有効なURLはnullを返す", () => {
    expect(validateUrl("https://example.com")).toBeNull();
    expect(validateUrl("http://example.com/path?q=1")).toBeNull();
  });

  it("無効なURLはエラー", () => {
    expect(validateUrl("not a url")).toBe("有効なURLを入力してください");
  });

  it("ftp:// はURLとして解析できないためエラー", () => {
    expect(validateUrl("ftp://")).toBe("有効なURLを入力してください");
  });
});

describe("validateMaxLength", () => {
  it("超過はエラー", () => {
    expect(validateMaxLength("abcdef", 5)).toBe("この項目は5文字以内で入力してください");
  });

  it("以内はnullを返す", () => {
    expect(validateMaxLength("abcde", 5)).toBeNull();
    expect(validateMaxLength("abc", 5)).toBeNull();
  });

  it("フィールド名が使われる", () => {
    expect(validateMaxLength("abcdef", 5, "タイトル")).toBe("タイトルは5文字以内で入力してください");
  });
});

describe("validateLength", () => {
  it("最小未満はエラー", () => {
    expect(validateLength("ab", 3, 10)).toBe("この項目は3文字以上で入力してください");
  });

  it("最大超過はエラー", () => {
    expect(validateLength("abcdefghijk", 3, 10)).toBe("この項目は10文字以内で入力してください");
  });

  it("範囲内はnullを返す", () => {
    expect(validateLength("abcde", 3, 10)).toBeNull();
  });
});

describe("validateRequiredWithMaxLength", () => {
  it("空値はエラー", () => {
    expect(validateRequiredWithMaxLength("")).toBe("この項目を入力してください");
    expect(validateRequiredWithMaxLength(null)).toBe("この項目を入力してください");
  });

  it("maxLength超過はエラー", () => {
    expect(validateRequiredWithMaxLength("abcdef", 5)).toBe("この項目は5文字以内で入力してください");
  });

  it("正常な値はnullを返す", () => {
    expect(validateRequiredWithMaxLength("abc", 10)).toBeNull();
    expect(validateRequiredWithMaxLength("abc")).toBeNull();
  });
});

describe("validateUrlWithProtocol", () => {
  it("空文字はエラー", () => {
    expect(validateUrlWithProtocol("")).toBe("URLを入力してください");
  });

  it("https://で始まる場合はnullを返す", () => {
    expect(validateUrlWithProtocol("https://example.com")).toBeNull();
  });

  it("http://で始まる場合はnullを返す", () => {
    expect(validateUrlWithProtocol("http://example.com")).toBeNull();
  });

  it("プロトコルなしはエラー", () => {
    expect(validateUrlWithProtocol("example.com")).toBe(
      'URLは「https://」または「http://」で始まるURL形式で入力してください'
    );
  });

  it("フィールド名が使われる", () => {
    expect(validateUrlWithProtocol("example.com", "会社URL")).toBe(
      '会社URLは「https://」または「http://」で始まるURL形式で入力してください'
    );
  });
});

describe("validateKatakana", () => {
  it("空文字はnullを返す（必須チェックは別途）", () => {
    expect(validateKatakana("")).toBeNull();
    expect(validateKatakana("   ")).toBeNull();
  });

  it("全角カタカナはnullを返す", () => {
    expect(validateKatakana("ヤマダタロウ")).toBeNull();
    expect(validateKatakana("ヴァイオリン")).toBeNull();
    expect(validateKatakana("アイウエオー")).toBeNull();
  });

  it("ひらがな・漢字はエラー", () => {
    expect(validateKatakana("やまだ")).toBe("この項目は全角カタカナで入力してください");
    expect(validateKatakana("山田")).toBe("この項目は全角カタカナで入力してください");
  });

  it("半角カタカナはエラー", () => {
    expect(validateKatakana("ﾔﾏﾀﾞ")).toBe("この項目は全角カタカナで入力してください");
  });

  it("フィールド名が使われる", () => {
    expect(validateKatakana("yamada", "氏名カナ")).toBe("氏名カナは全角カタカナで入力してください");
  });
});
