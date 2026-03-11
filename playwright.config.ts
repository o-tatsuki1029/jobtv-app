import { defineConfig, devices } from "@playwright/test";
import path from "path";
import dotenv from "dotenv";

// .env.test を読み込む（CI では環境変数が直接設定されている想定）
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global.setup.ts",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "jobtv",
      testMatch: /e2e\/(auth\.spec\.ts|jobtv\/.+\.spec\.ts)/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
        httpCredentials: process.env.TEST_BASIC_AUTH_USER
          ? {
              username: process.env.TEST_BASIC_AUTH_USER,
              password: process.env.TEST_BASIC_AUTH_PASSWORD ?? "",
            }
          : undefined,
      },
    },
    {
      name: "event-system",
      testMatch: /e2e\/event-system\/.+\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
    },
    {
      name: "agent-manager",
      testMatch: /e2e\/agent-manager\/.+\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3002",
      },
    },
  ],
  webServer: [
    {
      name: "jobtv",
      command: "pnpm --filter jobtv dev",
      url: "http://localhost:3000",
      reuseExistingServer: !isCI,
      timeout: 120000,
    },
    {
      name: "event-system",
      command: "pnpm --filter event-system dev",
      url: "http://localhost:3001",
      reuseExistingServer: !isCI,
      timeout: 120000,
    },
    {
      name: "agent-manager",
      command: "pnpm --filter agent-manager dev",
      url: "http://localhost:3002",
      reuseExistingServer: !isCI,
      timeout: 120000,
    },
  ],
});
