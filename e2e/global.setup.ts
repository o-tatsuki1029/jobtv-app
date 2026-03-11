/**
 * Playwright グローバルセットアップ
 *
 * テスト実行前に1回だけ各ロールでログインし、
 * セッション状態（Cookie）をファイルに保存する。
 * 各テストはこの保存済みセッションを使い回すため、
 * TOTP の競合や繰り返しログインが不要になる。
 */
import { chromium, type FullConfig } from "@playwright/test";
import { authenticator } from "otplib";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

const BASE_URL = "http://localhost:3000";
const STATE_DIR = path.resolve(__dirname, ".auth");

export const ADMIN_STATE = path.join(STATE_DIR, "admin.json");
export const RECRUITER_STATE = path.join(STATE_DIR, "recruiter.json");
export const CANDIDATE_STATE = path.join(STATE_DIR, "candidate.json");

export default async function globalSetup(_config: FullConfig) {
  const browser = await chromium.launch();

  const basicAuth = process.env.TEST_BASIC_AUTH_USER
    ? {
        username: process.env.TEST_BASIC_AUTH_USER,
        password: process.env.TEST_BASIC_AUTH_PASSWORD ?? "",
      }
    : undefined;

  // ディレクトリ作成
  const fs = await import("fs");
  fs.mkdirSync(STATE_DIR, { recursive: true });

  // --- 管理者ログイン（TOTP含む） ---
  {
    const email = process.env.TEST_ADMIN_EMAIL;
    const password = process.env.TEST_ADMIN_PASSWORD;
    const totpSecret = process.env.TEST_ADMIN_TOTP_SECRET;

    if (email && password && totpSecret) {
      const context = await browser.newContext({ httpCredentials: basicAuth });
      const page = await context.newPage();

      await page.goto(`${BASE_URL}/admin/login`);
      await page.getByLabel("メールアドレス").fill(email);
      await page.getByLabel("パスワード").fill(password);
      await page.getByRole("button", { name: "管理者としてログイン" }).click();
      await page.waitForURL(/\/admin\/verify-totp/, { timeout: 15000 });

      const code = authenticator.generate(totpSecret);
      await page.getByLabel("認証コード").fill(code);
      await page.getByRole("button", { name: "確認する" }).click();
      await page.waitForURL(/\/admin(?!\/(login|verify-totp|setup-totp))/, {
        timeout: 15000,
      });

      await context.storageState({ path: ADMIN_STATE });
      await context.close();
      console.log("✓ admin セッション保存完了");
    } else {
      console.warn("⚠ TEST_ADMIN_* が未設定のため admin セッションをスキップ");
    }
  }

  // --- 採用担当者ログイン ---
  {
    const email = process.env.TEST_RECRUITER_EMAIL;
    const password = process.env.TEST_RECRUITER_PASSWORD;

    if (email && password) {
      const context = await browser.newContext({ httpCredentials: basicAuth });
      const page = await context.newPage();

      await page.goto(`${BASE_URL}/studio/login`);
      await page.getByLabel(/メールアドレス|email/i).fill(email);
      await page.getByLabel(/パスワード|password/i).fill(password);
      await page.getByRole("button", { name: /ログイン|sign in/i }).click();
      await page.waitForURL(/\/studio(?!\/login)/, { timeout: 15000 });

      await context.storageState({ path: RECRUITER_STATE });
      await context.close();
      console.log("✓ recruiter セッション保存完了");
    } else {
      console.warn("⚠ TEST_RECRUITER_* が未設定のため recruiter セッションをスキップ");
    }
  }

  // --- 学生ログイン ---
  {
    const email = process.env.TEST_CANDIDATE_EMAIL;
    const password = process.env.TEST_CANDIDATE_PASSWORD;

    if (email && password) {
      const context = await browser.newContext({ httpCredentials: basicAuth });
      const page = await context.newPage();

      await page.goto(`${BASE_URL}/auth/login`);
      await page.getByLabel(/メールアドレス|email/i).fill(email);
      await page.getByLabel(/パスワード|password/i).fill(password);
      await page.getByRole("button", { name: /ログイン|sign in/i }).click();
      await page.waitForURL(/^(?!.*\/(auth\/login|admin\/login)).*$/, {
        timeout: 15000,
      });

      await context.storageState({ path: CANDIDATE_STATE });
      await context.close();
      console.log("✓ candidate セッション保存完了");
    } else {
      console.warn("⚠ TEST_CANDIDATE_* が未設定のため candidate セッションをスキップ");
    }
  }

  await browser.close();
}
