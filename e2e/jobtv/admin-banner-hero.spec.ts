import { test, expect } from "../fixtures/auth";

/**
 * 管理者によるバナー・ヒーロー管理のテスト
 *
 * 前提: TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD が設定されていること。
 */
test.describe("バナー・ヒーロー管理", () => {
  test("バナー管理ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/banners");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("ヒーローアイテム管理ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/hero-items");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("注目動画管理ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/featured-videos");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });
});
