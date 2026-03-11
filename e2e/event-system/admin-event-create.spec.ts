import { test, expect } from "@playwright/test";

/**
 * event-system 管理者フローのテスト
 *
 * 前提:
 * - TEST_EVENT_ADMIN_EMAIL / TEST_EVENT_ADMIN_PASSWORD が設定されていること。
 * - baseURL は http://localhost:3001 (playwright.config.ts の event-system project)
 */

async function loginAsEventAdmin(page: import("@playwright/test").Page) {
  const email = process.env.TEST_EVENT_ADMIN_EMAIL;
  const password = process.env.TEST_EVENT_ADMIN_PASSWORD;
  test.skip(!email || !password, "TEST_EVENT_ADMIN_EMAIL / TEST_EVENT_ADMIN_PASSWORD が未設定");

  await page.goto("/admin/login");
  await page.getByLabel(/メールアドレス|email/i).fill(email!);
  await page.getByLabel(/パスワード|password/i).fill(password!);
  await page.getByRole("button", { name: /ログイン|sign in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 15000 });
}

test.describe("event-system 管理者フロー", () => {
  test("管理者ログインページが表示される", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("button", { name: /ログイン|sign in/i })).toBeVisible();
  });

  test("未ログインで管理ページにアクセスするとリダイレクトされる", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login|\//);
  });

  test("管理者ログイン後にダッシュボードが表示される", async ({ page }) => {
    await loginAsEventAdmin(page);
    await expect(page.locator("main")).toBeVisible();
  });

  test("マッチングページにアクセスできる", async ({ page }) => {
    await loginAsEventAdmin(page);
    await page.goto("/admin/matching");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });
});
