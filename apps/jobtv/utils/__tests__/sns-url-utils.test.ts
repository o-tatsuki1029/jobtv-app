import { describe, it, expect } from "vitest";
import { extractAccountName, generateSnsUrl } from "../sns-url-utils";

describe("extractAccountName", () => {
  describe("X (Twitter)", () => {
    it("https://x.com/account からアカウント名を抽出する", () => {
      expect(extractAccountName("https://x.com/jobtv_official", "x")).toBe("@jobtv_official");
    });

    it("https://twitter.com/account からアカウント名を抽出する", () => {
      expect(extractAccountName("https://twitter.com/jobtv_official", "x")).toBe("@jobtv_official");
    });

    it("undefinedのとき空文字を返す", () => {
      expect(extractAccountName(undefined, "x")).toBe("");
    });

    it("すでに@付きの場合はそのまま返す", () => {
      expect(extractAccountName("@jobtv_official", "x")).toBe("@jobtv_official");
    });
  });

  describe("Instagram", () => {
    it("https://instagram.com/account からアカウント名を抽出する", () => {
      expect(extractAccountName("https://instagram.com/jobtv_official", "instagram")).toBe("@jobtv_official");
    });

    it("末尾スラッシュありでも抽出できる", () => {
      expect(extractAccountName("https://www.instagram.com/jobtv_official/", "instagram")).toBe("@jobtv_official");
    });
  });

  describe("TikTok", () => {
    it("https://tiktok.com/@account からアカウント名を抽出する", () => {
      expect(extractAccountName("https://tiktok.com/@jobtv_official", "tiktok")).toBe("@jobtv_official");
    });
  });

  describe("YouTube", () => {
    it("https://youtube.com/@account からアカウント名を抽出する", () => {
      expect(extractAccountName("https://youtube.com/@jobtv_official", "youtube")).toBe("@jobtv_official");
    });

    it("https://youtube.com/c/account からアカウント名を抽出する", () => {
      expect(extractAccountName("https://youtube.com/c/jobtv_official", "youtube")).toBe("@jobtv_official");
    });
  });
});

describe("generateSnsUrl", () => {
  it("X の URL を生成する", () => {
    expect(generateSnsUrl("@jobtv_official", "x")).toBe("https://x.com/jobtv_official");
  });

  it("Instagram の URL を生成する", () => {
    expect(generateSnsUrl("@jobtv_official", "instagram")).toBe("https://instagram.com/jobtv_official");
  });

  it("TikTok の URL を生成する（@ 付き）", () => {
    expect(generateSnsUrl("@jobtv_official", "tiktok")).toBe("https://tiktok.com/@jobtv_official");
  });

  it("YouTube の URL を生成する", () => {
    expect(generateSnsUrl("@jobtv_official", "youtube")).toBe("https://youtube.com/@jobtv_official");
  });

  it("空文字は空文字を返す", () => {
    expect(generateSnsUrl("", "x")).toBe("");
    expect(generateSnsUrl("  ", "x")).toBe("");
  });

  it("@ なしのアカウント名でも正しく生成する", () => {
    expect(generateSnsUrl("jobtv_official", "x")).toBe("https://x.com/jobtv_official");
  });

  it("URL 形式で渡されても正しく生成する", () => {
    expect(generateSnsUrl("https://x.com/jobtv_official", "x")).toBe("https://x.com/jobtv_official");
  });
});
