import { test, expect } from "@playwright/test";

/**
 * event-system 採用担当者評価フローのテスト
 *
 * 前提:
 * - TEST_EVENT_RECRUITER_EMAIL / TEST_EVENT_RECRUITER_PASSWORD が設定されていること。
 * - baseURL は http://localhost:3001
 */

async function loginAsEventRecruiter(page: import("@playwright/test").Page) {
  const email = process.env.TEST_EVENT_RECRUITER_EMAIL;
  const password = process.env.TEST_EVENT_RECRUITER_PASSWORD;
  test.skip(!email || !password, "TEST_EVENT_RECRUITER_EMAIL / TEST_EVENT_RECRUITER_PASSWORD が未設定");

  await page.goto("/recruiter/login");
  await page.getByLabel(/メールアドレス|email/i).fill(email!);
  await page.getByLabel(/パスワード|password/i).fill(password!);
  await page.getByRole("button", { name: /ログイン|sign in/i }).click();
  await page.waitForURL(/\/recruiter/, { timeout: 15000 });
}

test.describe("採用担当者評価フロー", () => {
  test("採用担当者ログインページが表示される", async ({ page }) => {
    await page.goto("/recruiter/login");
    await expect(
      page.getByRole("button", { name: /ログイン|sign in/i })
    ).toBeVisible();
  });

  test("採用担当者ログイン後に評価ページにアクセスできる", async ({ page }) => {
    await loginAsEventRecruiter(page);
    await page.goto("/recruiter/rating");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("採用担当者ログイン後にフィードバックページにアクセスできる", async ({ page }) => {
    await loginAsEventRecruiter(page);
    await page.goto("/recruiter/feedback");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });
});
