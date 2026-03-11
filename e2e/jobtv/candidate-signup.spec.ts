import { test, expect } from "@playwright/test";

/**
 * 学生会員登録フローのテスト
 *
 * 前提: ステージング環境でテスト用メールアドレスが未登録であること。
 * テスト後に作成されたアカウントをクリーンアップすること。
 */
test.describe("学生会員登録フロー", () => {
  test("会員登録ページのメールアドレス入力ステップが表示される", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByLabel(/メールアドレス/)).toBeVisible();
    await expect(page.getByRole("button", { name: "次へ" })).toBeVisible();
  });

  test("無効なメールアドレスでは次へ進めない", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByLabel(/メールアドレス/).fill("not-an-email");
    await page.getByRole("button", { name: "次へ" }).click();
    // バリデーションエラーが表示される
    await expect(page.getByText("正しい形式のメールアドレスを入力してください")).toBeVisible();
    // step が form に進んでいないことを確認（メールフィールドがまだ表示されている）
    await expect(page.getByLabel(/メールアドレス/)).toBeVisible();
  });

  test("既存アカウントのメールアドレスを入力するとログインへ誘導される", async ({ page }) => {
    const existingEmail = process.env.TEST_CANDIDATE_EMAIL;
    test.skip(!existingEmail, "TEST_CANDIDATE_EMAIL が設定されていません");

    await page.goto("/auth/signup");
    await page.getByLabel(/メールアドレス/).fill(existingEmail!);
    await page.getByRole("button", { name: "次へ" }).click();
    // 既存アカウントの場合はログインへ誘導
    await expect(page.getByText("すでにアカウントがあります。ログインしてください。")).toBeVisible({ timeout: 10000 });
  });
});
