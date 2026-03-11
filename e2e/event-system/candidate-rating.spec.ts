import { test, expect } from "@playwright/test";

/**
 * event-system 学生評価フローのテスト
 *
 * 前提:
 * - TEST_EVENT_CANDIDATE_SEAT（座席番号）と TEST_EVENT_CANDIDATE_PHONE が設定されていること。
 * - baseURL は http://localhost:3001
 */

test.describe("学生評価フロー", () => {
  test("学生ログインページ（座席番号+電話番号）が表示される", async ({ page }) => {
    await page.goto("/candidate/login");
    // 座席番号・電話番号の入力フォームが存在する
    await expect(
      page.getByLabel(/座席|シート|番号/i).or(page.getByPlaceholder(/座席|シート/i))
    ).toBeVisible();
  });

  test("学生ログイン後に評価ページにアクセスできる", async ({ page }) => {
    const seat = process.env.TEST_EVENT_CANDIDATE_SEAT;
    const phone = process.env.TEST_EVENT_CANDIDATE_PHONE;
    test.skip(!seat || !phone, "TEST_EVENT_CANDIDATE_SEAT / TEST_EVENT_CANDIDATE_PHONE が未設定");

    await page.goto("/candidate/login");
    await page.getByLabel(/座席|シート|番号/i).fill(seat!);
    await page.getByLabel(/電話/i).fill(phone!);
    await page.getByRole("button", { name: /ログイン|sign in/i }).click();
    await page.waitForURL(/\/candidate/, { timeout: 15000 });

    await page.goto("/candidate/rating");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });
});
