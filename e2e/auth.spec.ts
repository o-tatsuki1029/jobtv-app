import { test, expect } from "@playwright/test";

test.describe("認証フロー", () => {
  test("未ログインユーザーはログインページにリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/studio");
    await expect(page).toHaveURL(/login/);
  });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /ログイン|sign in/i })).toBeVisible();
  });
});
