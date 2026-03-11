# テスト戦略

## 概要

jobtv-app のテストは **E2E（Playwright）中心 + ユーティリティ単体テスト（Vitest）** の構成を採用する。

Next.js App Router + Supabase 構成ではビジネスロジックが Server Actions に集中しているため、E2E でクリティカルパスを重点的にカバーし、純粋な関数にのみユニットテストを適用する。

---

## テスト構成

```
テストピラミッド（このプロジェクトに最適化）
┌──────────────────────────────┐
│      E2E (Playwright)        │  ← 認証・主要ユーザーフロー全体
│   jobtv: 41件                │
├──────────────────────────────┤
│   Unit (Vitest)              │  ← 純粋なユーティリティ・バリデーション
│   74件                       │
└──────────────────────────────┘
```

---

## セットアップ

### Playwright（E2E）

```bash
pnpm exec playwright install chromium
```

### Vitest（ユニットテスト）

追加インストール不要。

---

## テスト実行コマンド

```bash
# ユニットテスト（全件実行）
pnpm test:unit

# ユニットテスト（ウォッチモード）
pnpm test:unit:watch

# E2E テスト（jobtv・ヘッドレス）
pnpm test:e2e --project=jobtv

# E2E テスト（UI モード・デバッグ用）
pnpm test:e2e:ui

# E2E テスト（特定ファイルのみ）
pnpm test:e2e --project=jobtv e2e/jobtv/admin-review.spec.ts
```

---

## ユニットテスト一覧（74件）

### バリデーション（39件） `packages/shared/utils/__tests__/validation.test.ts`

| 関数 | テスト内容 |
|------|-----------|
| `validateEmail` | 空文字・有効・無効フォーマット |
| `validatePassword` | 空文字・最小文字数・デフォルト6文字 |
| `validatePasswordConfirm` | 空文字・不一致・一致 |
| `validateRequired` | 空値（null/undefined/空文字）・フィールド名指定 |
| `validatePhone` | 空文字・有効な日本電話番号・無効 |
| `validateUrl` | 空文字・有効URL・無効URL |
| `validateMaxLength` | 超過・以内・フィールド名 |
| `validateLength` | 最小未満・最大超過・範囲内 |
| `validateRequiredWithMaxLength` | 空値・超過・正常 |
| `validateUrlWithProtocol` | https/http 必須・プロトコルなしエラー・フィールド名 |
| `validateKatakana` | 全角カタカナ・ひらがな漢字エラー・半角エラー |

### 文字数カウント（9件） `packages/shared/utils/__tests__/char-count.test.ts`

| 関数 | テスト内容 |
|------|-----------|
| `getCharCountText` | maxLength あり/なし の表示形式 |
| `getCharCountLevel` | error/warning/normal の判定境界値 |
| `getCharCountClassName` | 各レベルに対応する CSS クラス |

### フォーム変更検知（10件） `apps/jobtv/utils/__tests__/form-utils.test.ts`

| 関数 | テスト内容 |
|------|-----------|
| `hasFieldChanges` | 変更あり/なし・フィールド指定・null/undefined 扱い |
| `hasArrayChanges` | 同一/異なる配列 |
| `hasObjectChanges` | 同一/異なるオブジェクト |
| `hasChanges` | 複数チェックの OR 結合 |

### SNS URL ユーティリティ（16件） `apps/jobtv/utils/__tests__/sns-url-utils.test.ts`

| 関数 | テスト内容 |
|------|-----------|
| `extractAccountName` | X・Instagram・TikTok・YouTube 各 URL からアカウント名抽出 |
| `generateSnsUrl` | 各プラットフォームの URL 生成・空文字・@ なし・URL 形式入力 |

---

## E2E テスト一覧（41件）

### 認証フロー（5件） `e2e/auth.spec.ts`

| テスト内容 | 確認観点 |
|-----------|---------|
| 未ログインで `/studio` → リダイレクト | ルート保護 |
| 未ログインで `/admin` → リダイレクト | ルート保護 |
| `/auth/login` ページ表示確認 | 公開ページ |
| `/studio/login` ページ表示確認 | 公開ページ |
| 誤パスワードでログイン → エラーメッセージ | UX |

### 公開ページ（5件） `e2e/jobtv/public-pages.spec.ts`

| テスト内容 | URL |
|-----------|-----|
| トップページ表示 | `/` |
| トップページのヘッダー表示 | `/` |
| ログインページ表示 | `/auth/login` |
| 会員登録ページ表示 | `/auth/signup` |
| Studio ログインページ表示 | `/studio/login` |

### 学生会員登録フロー（3件） `e2e/jobtv/candidate-signup.spec.ts`

| テスト内容 | 確認観点 |
|-----------|---------|
| メールアドレス入力ステップ表示 | フォーム表示 |
| 無効なメールアドレスでバリデーションエラー | クライアントバリデーション |
| 既存メールアドレスでログインへ誘導 | 重複チェック |

### 学生エントリーフロー（2件） `e2e/jobtv/candidate-entry.spec.ts`

| テスト内容 | 確認観点 |
|-----------|---------|
| ログイン済み学生がトップページを閲覧できる | 認証状態確認 |
| 未ログインで求人ページにアクセスするとリダイレクト | ルート保護 |

### 学生マイページ（5件） `e2e/jobtv/candidate-mypage.spec.ts`

| テスト内容 | URL | 確認観点 |
|-----------|-----|---------|
| 未ログインで `/mypage` → リダイレクト | `/mypage` | ルート保護 |
| マイページトップ表示 | `/mypage` | candidate 認証 |
| エントリー一覧表示 | `/mypage/entries` | candidate 認証 |
| 説明会予約一覧表示 | `/mypage/reservations` | candidate 認証 |
| プロフィールページ表示 | `/mypage/profile` | candidate 認証 |

### Studio 求人管理（3件） `e2e/jobtv/studio-job-draft.spec.ts`

| テスト内容 | URL |
|-----------|-----|
| Studio ダッシュボード表示 | `/studio` |
| 求人一覧ページ表示 | `/studio/jobs` |
| 求人作成ページ表示 | `/studio/jobs/new` |

### Studio 説明会・企業ページ管理（5件） `e2e/jobtv/studio-sessions.spec.ts`

| テスト内容 | URL |
|-----------|-----|
| 説明会一覧ページ表示 | `/studio/sessions` |
| 企業ページ管理表示 | `/studio/company` |
| 候補者一覧ページ表示 | `/studio/candidates` |
| 動画管理ページ表示 | `/studio/videos` |
| 設定ページ表示 | `/studio/settings` |

### 管理者審査フロー（4件） `e2e/jobtv/admin-review.spec.ts`

| テスト内容 | 確認観点 |
|-----------|---------|
| 管理者ログイン（TOTP自動入力）後に管理画面表示 | TOTP 認証フロー |
| 審査ページ表示 | `/admin/review` |
| 企業アカウントページ表示 | `/admin/company-accounts` |
| 非管理者が管理画面にアクセスするとリダイレクト | ルート保護 |

### バナー・ヒーロー管理（3件） `e2e/jobtv/admin-banner-hero.spec.ts`

| テスト内容 | URL |
|-----------|-----|
| バナー管理ページ表示 | `/admin/banners` |
| ヒーローアイテム管理ページ表示 | `/admin/hero-items` |
| 注目動画管理ページ表示 | `/admin/featured-videos` |

### 管理者アカウント・コンテンツ管理（6件） `e2e/jobtv/admin-accounts.spec.ts`

| テスト内容 | URL |
|-----------|-----|
| 学生アカウント管理ページ表示 | `/admin/student-accounts` |
| 企業一覧ページ表示 | `/admin/companies` |
| 求人一覧ページ表示 | `/admin/jobs` |
| 説明会一覧ページ表示 | `/admin/sessions` |
| メールテンプレート管理ページ表示 | `/admin/email/templates` |
| メール送信ログページ表示 | `/admin/email/logs` |

---

## ディレクトリ構成

```
e2e/
├── fixtures/
│   └── auth.ts                        # ロール別認証フィクスチャ（storageState使用）
├── global.setup.ts                    # テスト実行前に1回だけログイン・セッション保存
├── .auth/                             # 保存済みセッション（gitignore済み）
├── auth.spec.ts
├── jobtv/
│   ├── public-pages.spec.ts
│   ├── candidate-signup.spec.ts
│   ├── candidate-entry.spec.ts
│   ├── candidate-mypage.spec.ts
│   ├── studio-job-draft.spec.ts
│   ├── studio-sessions.spec.ts
│   ├── admin-review.spec.ts
│   ├── admin-banner-hero.spec.ts
│   └── admin-accounts.spec.ts
├── event-system/
│   ├── admin-event-create.spec.ts
│   ├── recruiter-rating.spec.ts
│   └── candidate-rating.spec.ts
└── agent-manager/
    ├── candidate-crud.spec.ts
    └── application-tracking.spec.ts

packages/shared/utils/__tests__/
├── validation.test.ts
└── char-count.test.ts

apps/jobtv/utils/__tests__/
├── form-utils.test.ts
└── sns-url-utils.test.ts
```

---

## 認証フィクスチャ（`e2e/fixtures/auth.ts`）

`global.setup.ts` で事前にログイン・セッションをファイルに保存し、各テストはそれを使い回す方式。
これにより TOTP の競合（並列実行での使い捨てコード問題）を回避している。

| フィクスチャ名 | ロール | 環境変数 |
|--------------|--------|---------|
| `adminPage` | admin（管理者・TOTP自動入力） | `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` / `TEST_ADMIN_TOTP_SECRET` |
| `recruiterPage` | recruiter（採用担当者） | `TEST_RECRUITER_EMAIL` / `TEST_RECRUITER_PASSWORD` |
| `candidatePage` | candidate（学生） | `TEST_CANDIDATE_EMAIL` / `TEST_CANDIDATE_PASSWORD` |

### 使用例

```ts
// 認証済みフィクスチャを使う場合
import { test, expect } from "../fixtures/auth";

test("管理者として管理画面にアクセス", async ({ adminPage: page }) => {
  await page.goto("/admin/review");
  await expect(page.locator("main")).toBeVisible();
});

// 未認証テストと混在させる場合
import { test as authTest, expect } from "../fixtures/auth";
import { test } from "@playwright/test";

test("未ログインでリダイレクト", async ({ page }) => { ... });
authTest("ログイン済みでアクセス", async ({ candidatePage: page }) => { ... });
```

---

## 環境変数（`.env.test`）

`.env.test` をリポジトリルートに作成し、テスト用アカウント情報を設定する（gitignore済み）。

```env
# Basic 認証（ステージング全体）
TEST_BASIC_AUTH_USER=admin
TEST_BASIC_AUTH_PASSWORD=test

# 管理者（MFA有効・TOTP シークレットを設定）
TEST_ADMIN_EMAIL=...
TEST_ADMIN_PASSWORD=...
TEST_ADMIN_TOTP_SECRET=...   # TOTP設定時「手動入力」欄の文字列

# 採用担当者
TEST_RECRUITER_EMAIL=...
TEST_RECRUITER_PASSWORD=...

# 学生
TEST_CANDIDATE_EMAIL=...
TEST_CANDIDATE_PASSWORD=...
```

---

## マルチアプリ対応

| project | baseURL | 対象テスト |
|---------|---------|-----------|
| `jobtv` | `http://localhost:3000` | `e2e/auth.spec.ts`、`e2e/jobtv/**` |
| `event-system` | `http://localhost:3001` | `e2e/event-system/**` |
| `agent-manager` | `http://localhost:3002` | `e2e/agent-manager/**` |

---

## 技術的注意事項

| 課題 | 対策 |
|------|------|
| TOTP の並列競合 | `global.setup.ts` でログイン1回・`storageState` で全テスト共有 |
| Basic 認証 | `playwright.config.ts` の `httpCredentials` に設定 |
| テストデータ汚染 | ステージング専用アカウントを使用。テスト後クリーンアップ |
| 動画アップロード（AWS） | E2E 対象外・手動確認 |
| LINE OAuth | E2E 対象外・手動確認 |

---

## 現在テスト対象外のページ（意図的除外）

| ページ | 除外理由 |
|--------|---------|
| `/admin/line`, `/admin/line/broadcast` | LINE 外部サービス連携のため手動確認 |
| `/studio/videos/:id`, `/studio/jobs/:id` など詳細ページ | テストデータの ID に依存するため |
| `/admin/companies/:id`, `/admin/sessions/:id` など詳細ページ | 同上 |
| `/settings/line` | LINE OAuth のため手動確認 |
| `event-system`, `agent-manager` | dev サーバー別途起動が必要（環境変数設定後に実行） |
