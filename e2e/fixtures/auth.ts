import { test as base, expect, type Page } from "@playwright/test";
import path from "path";

const STATE_DIR = path.resolve(__dirname, "../.auth");
export const ADMIN_STATE = path.join(STATE_DIR, "admin.json");
export const RECRUITER_STATE = path.join(STATE_DIR, "recruiter.json");
export const CANDIDATE_STATE = path.join(STATE_DIR, "candidate.json");

/**
 * 認証フィクスチャ
 *
 * global.setup.ts で事前に保存したセッション（Cookie）を使い回す。
 * ログイン処理は global setup で1回だけ実行されるため、
 * TOTP の競合や並列実行の問題が起きない。
 *
 * 使用例:
 *   import { test, expect } from "../fixtures/auth";
 *   test("管理者テスト", async ({ adminPage: page }) => { ... });
 */
type AuthFixtures = {
  adminPage: Page;
  recruiterPage: Page;
  candidatePage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: ADMIN_STATE,
      httpCredentials: process.env.TEST_BASIC_AUTH_USER
        ? {
            username: process.env.TEST_BASIC_AUTH_USER,
            password: process.env.TEST_BASIC_AUTH_PASSWORD ?? "",
          }
        : undefined,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  recruiterPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: RECRUITER_STATE,
      httpCredentials: process.env.TEST_BASIC_AUTH_USER
        ? {
            username: process.env.TEST_BASIC_AUTH_USER,
            password: process.env.TEST_BASIC_AUTH_PASSWORD ?? "",
          }
        : undefined,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  candidatePage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: CANDIDATE_STATE,
      httpCredentials: process.env.TEST_BASIC_AUTH_USER
        ? {
            username: process.env.TEST_BASIC_AUTH_USER,
            password: process.env.TEST_BASIC_AUTH_PASSWORD ?? "",
          }
        : undefined,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect };
