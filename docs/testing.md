# E2E テスト（Playwright）

## 概要

E2E テストには [Playwright](https://playwright.dev/) を使用する。
テストファイルはリポジトリルートの `e2e/` ディレクトリに配置する。

---

## セットアップ

Playwright はルートの `package.json` に `devDependencies` として追加済み。
初回のみブラウザバイナリをインストールする：

```bash
pnpm exec playwright install
```

---

## ディレクトリ構成

```
e2e/
  auth.spec.ts       # 認証フローのテスト
playwright.config.ts # Playwright 設定（ルートに配置）
```

### playwright.config.ts の主な設定

| 設定項目 | 値 |
|---------|-----|
| `testDir` | `./e2e` |
| `baseURL` | `http://localhost:3000` |
| ブラウザ | Chromium のみ |
| `webServer` | `pnpm --filter jobtv dev`（ローカル時は既存サーバーを再利用） |
| CI 時 retries | 2 |

---

## テスト実行コマンド

```bash
# ヘッドレスで全テスト実行
pnpm test:e2e

# UI モードで実行（ブラウザを開いてデバッグ可能）
pnpm test:e2e:ui
```

`webServer` 設定により、`pnpm test:e2e` 実行時に dev サーバーが自動起動する。
ローカルで既に `pnpm dev` が起動中の場合はそのサーバーを再利用する（`reuseExistingServer: true`）。

---

## 新規テスト追加ガイドライン

1. `e2e/` 配下に `<feature>.spec.ts` を作成する
2. テストはユーザー操作単位（認証・フォーム送信・ページ遷移等）で記述する
3. 認証が必要なテストは `page.goto('/login')` からのフローを含める
4. テストデータはステージング環境の専用アカウントを使用し、本番データに触れない

```ts
import { test, expect } from "@playwright/test";

test.describe("機能名", () => {
  test("テスト内容の説明", async ({ page }) => {
    await page.goto("/path");
    await expect(page.getByRole("button", { name: "ボタン名" })).toBeVisible();
  });
});
```

---

## CI 環境

CI では `process.env.CI` が設定されるため以下が自動的に適用される：

- `forbidOnly: true`（`test.only` があるとビルド失敗）
- `retries: 2`
- `workers: 1`（並列実行なし）
