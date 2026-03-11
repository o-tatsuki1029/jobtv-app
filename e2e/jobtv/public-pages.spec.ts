import { test, expect } from "@playwright/test";

test.describe("公開ページ", () => {
  test("トップページが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.+/);
    // ヒーロービジュアルまたはメインコンテンツが表示される
    await expect(page.locator("main, #__next")).toBeVisible();
  });

  test("トップページにナビゲーションヘッダーが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
  });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("button", { name: /ログイン|sign in/i })).toBeVisible();
  });

  test("会員登録ページが表示される", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /登録|JOBTV/i })).toBeVisible();
  });

  test("Studio ログインページが表示される", async ({ page }) => {
    await page.goto("/studio/login");
    await expect(page.getByRole("button", { name: /ログイン|sign in/i })).toBeVisible();
  });
});
