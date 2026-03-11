import { test, expect } from "@playwright/test";

test.describe("認証フロー", () => {
  test("未ログインユーザーはログインページにリダイレクトされる（Studio）", async ({
    page,
  }) => {
    await page.goto("/studio");
    await expect(page).toHaveURL(/login/);
  });

  test("未ログインユーザーはログインページにリダイレクトされる（管理画面）", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/login/);
  });

  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("button", { name: /ログイン|sign in/i })).toBeVisible();
  });

  test("Studio ログインページが表示される", async ({ page }) => {
    await page.goto("/studio/login");
    await expect(page.getByRole("button", { name: /ログイン|sign in/i })).toBeVisible();
  });

  test("誤ったパスワードでログインするとエラーが表示される", async ({ page }) => {
    await page.goto("/studio/login");
    await page.getByLabel(/メールアドレス|email/i).fill("wrong@example.com");
    await page.getByLabel(/パスワード|password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /ログイン|sign in/i }).click();
    // エラーメッセージが表示される（ページ遷移しない）
    await expect(page).toHaveURL(/login/);
    await expect(
      page.getByText("メールアドレスまたはパスワードが正しくありません。")
    ).toBeVisible({ timeout: 10000 });
  });
});
