import { test, expect } from "../fixtures/auth";

/**
 * 管理者審査フローのテスト
 *
 * 前提:
 * - TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD が設定されていること。
 * - テスト用管理者アカウントは MFA (TOTP) を無効化しておくこと。
 */
test.describe("管理者審査フロー", () => {
  test("管理者ログイン後に管理画面が表示される", async ({ adminPage: page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("管理画面の審査ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/review");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("管理画面の企業アカウントページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/company-accounts");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("非管理者が管理画面にアクセスするとリダイレクトされる", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login|\/$/);
  });
});
