import { test, expect } from "../fixtures/auth";

/**
 * Studio 求人下書き → 審査提出フローのテスト
 *
 * 前提: TEST_RECRUITER_EMAIL / TEST_RECRUITER_PASSWORD が設定されていること。
 */
test.describe("Studio 求人下書き・提出フロー", () => {
  test("採用担当者ログイン後に Studio ダッシュボードが表示される", async ({
    recruiterPage: page,
  }) => {
    await page.goto("/studio");
    await expect(page).not.toHaveURL(/login/);
    // Studio ダッシュボードの見出しが表示される
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("求人一覧ページにアクセスできる", async ({ recruiterPage: page }) => {
    await page.goto("/studio/jobs");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("求人作成ページにアクセスできる", async ({ recruiterPage: page }) => {
    await page.goto("/studio/jobs/new");
    await expect(page).not.toHaveURL(/login/);
    // 求人作成フォームが表示される
    await expect(
      page.getByRole("heading", { name: /求人|作成/i }).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
