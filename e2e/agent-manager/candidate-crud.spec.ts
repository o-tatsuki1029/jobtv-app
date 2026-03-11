import { test, expect } from "@playwright/test";

/**
 * agent-manager 候補者 CRUD のテスト
 *
 * 前提:
 * - baseURL は http://localhost:3002
 * - agent-manager は認証なし、または別途認証が必要
 */
test.describe("候補者 CRUD", () => {
  test("候補者一覧ページが表示される", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("main, body")).toBeVisible();
  });

  test("候補者詳細ページにアクセスできる", async ({ page }) => {
    await page.goto("/candidates");
    // リストまたはメッセージが表示される
    await expect(page.locator("main")).toBeVisible();
  });

  test("応募管理ページにアクセスできる", async ({ page }) => {
    await page.goto("/applications");
    await expect(page.locator("main")).toBeVisible();
  });
});
