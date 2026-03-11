import { test, expect } from "@playwright/test";
import { test as authTest } from "../fixtures/auth";

test.describe("未ログインでマイページ保護確認", () => {
  test("未ログインで /mypage にアクセスするとリダイレクトされる", async ({ page }) => {
    await page.goto("/mypage");
    await expect(page).toHaveURL(/login/);
  });
});

authTest.describe("学生マイページ", () => {
  authTest("マイページトップにアクセスできる", async ({ candidatePage: page }) => {
    await page.goto("/mypage");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  authTest("エントリー一覧ページにアクセスできる", async ({ candidatePage: page }) => {
    await page.goto("/mypage/entries");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  authTest("説明会予約一覧ページにアクセスできる", async ({ candidatePage: page }) => {
    await page.goto("/mypage/reservations");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  authTest("プロフィールページにアクセスできる", async ({ candidatePage: page }) => {
    await page.goto("/mypage/profile");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });
});
