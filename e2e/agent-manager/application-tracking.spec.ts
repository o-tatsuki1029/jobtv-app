import { test, expect } from "@playwright/test";

/**
 * agent-manager 応募管理のテスト
 *
 * 前提:
 * - baseURL は http://localhost:3002
 */
test.describe("応募管理", () => {
  test("求人一覧ページにアクセスできる", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page.locator("main")).toBeVisible();
  });

  test("応募一覧ページにアクセスできる", async ({ page }) => {
    await page.goto("/applications");
    await expect(page.locator("main")).toBeVisible();
  });

  test("ダッシュボードが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    // タイトルまたはナビゲーションが表示される
    await expect(
      page.locator("header, nav, main").first()
    ).toBeVisible();
  });
});
