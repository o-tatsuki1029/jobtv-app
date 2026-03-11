import { test, expect } from "../fixtures/auth";

/**
 * 管理者によるアカウント・求人・説明会管理ページのテスト
 */
test.describe("管理者アカウント・コンテンツ管理", () => {
  test("学生アカウント管理ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/student-accounts");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("企業一覧ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/companies");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("求人一覧ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/jobs");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("説明会一覧ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/sessions");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("メールテンプレート管理ページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/email/templates");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("メール送信ログページにアクセスできる", async ({ adminPage: page }) => {
    await page.goto("/admin/email/logs");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });
});
