import { test, expect } from "../fixtures/auth";

/**
 * Studio の説明会・企業ページ・候補者管理のテスト（recruiter）
 */
test.describe("Studio 説明会・企業ページ管理", () => {
  test("説明会一覧ページにアクセスできる", async ({ recruiterPage: page }) => {
    await page.goto("/studio/sessions");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("企業ページ管理にアクセスできる", async ({ recruiterPage: page }) => {
    await page.goto("/studio/company");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("候補者一覧ページにアクセスできる", async ({ recruiterPage: page }) => {
    await page.goto("/studio/candidates");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("動画管理ページにアクセスできる", async ({ recruiterPage: page }) => {
    await page.goto("/studio/videos");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("設定ページにアクセスできる", async ({ recruiterPage: page }) => {
    await page.goto("/studio/settings");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("main")).toBeVisible();
  });
});
