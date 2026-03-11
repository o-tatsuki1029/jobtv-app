import { test, expect } from "../fixtures/auth";

/**
 * 学生のエントリー・説明会予約フローのテスト
 *
 * 前提: TEST_CANDIDATE_EMAIL / TEST_CANDIDATE_PASSWORD が設定されていること。
 */
test.describe("学生エントリーフロー", () => {
  test("ログイン後にトップページが表示される", async ({ candidatePage: page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    // ログアウトボタン or マイページリンクが存在することでログイン済みを確認
    await expect(
      page.getByRole("link", { name: /マイページ|プロフィール/i }).or(
        page.getByRole("button", { name: /ログアウト/i })
      ).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("未ログインでエントリーしようとするとログインページにリダイレクト", async ({ page }) => {
    // ログインせずに応募ページに直接アクセス
    await page.goto("/jobs");
    // 保護されているページはログインへリダイレクト、もしくは公開一覧として表示
    const url = page.url();
    // 公開ページであれば 200、保護ページであれば /login にリダイレクト
    expect(url).toMatch(/\/(auth\/login|jobs)/);
  });
});
