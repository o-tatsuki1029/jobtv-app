# セットアップガイド

このドキュメントでは、JOBTV App Monorepo の詳細なセットアップ手順を説明します。

## 前提条件

- **Node.js**: 18 以上
- **pnpm**: 8 以上
- **Supabase CLI**: マイグレーション管理に必要

## 1. リポジトリのクローンとインストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd jobtv-app

# pnpmがインストールされていない場合
npm install -g pnpm

# 依存関係のインストール
pnpm install
```

## 2. 環境変数の設定

### 2.1 ファイル構成

| ファイル | 用途 |
|---------|------|
| `.env.local`（ルート） | 全アプリ共通のローカル開発用 |
| `apps/jobtv/.env.local` | jobtv ローカル用（フル設定） |
| `apps/event-system/.env.local` | event-system ローカル用 |
| `apps/agent-manager/.env.local` | agent-manager ローカル用 |
| `apps/jobtv/.env.staging` | STG 用の管理台帳（実際は Vercel Dashboard に設定） |
| `apps/jobtv/.env.production` | PROD 用の管理台帳（実際は Vercel Dashboard に設定） |
| `.env.test` | E2E テスト用（gitignore 済み）。詳細は [testing.md](testing.md) |

> **注意**: Supabase の環境変数はルートに設定しないでください。各アプリで個別に設定する必要があります。

### 2.2 共通環境変数（ルート `.env.local`）

```bash
SKIP_ZEROTRUST_CHECK=true
```

> `SKIP_ZEROTRUST_CHECK=true` を設定すると、各アプリの `instrumentation.ts` が起動時に `NODE_TLS_REJECT_UNAUTHORIZED=0` を自動適用します。

### 2.3 jobtv 環境変数一覧（`apps/jobtv/.env.local`）

jobtv はほぼすべての外部サービスを使用するため、設定項目が最も多い。

#### Supabase

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase プロジェクト URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service_role key（サーバー専用） | 同上 |
| `SUPABASE_JWT_SECRET` | Yes | JWT 検証用シークレット | Supabase Dashboard → Settings → API → JWT Secret |
| `SUPABASE_HOOK_SECRET` | Yes | Auth Webhook 検証用シークレット | Supabase Dashboard → Auth → Hooks で設定した値 |

#### Site

| 変数名 | 必須 | 説明 | 値の例 |
|--------|------|------|--------|
| `NEXT_PUBLIC_SITE_URL` | Yes | サイトの公開 URL | ローカル: `http://localhost:3000` / PROD: `https://media.jobtv.jp` |

#### AWS（動画ストリーミング）

動画アップロード・変換・配信機能を使用する場合に必要。詳細は [aws-video.md](aws-video.md)。

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `AWS_REGION` | Yes | AWS リージョン | 固定: `ap-northeast-1` |
| `AWS_ACCESS_KEY_ID` | Yes | IAM アクセスキー | AWS コンソール → IAM → ユーザー → セキュリティ認証情報 |
| `AWS_SECRET_ACCESS_KEY` | Yes | IAM シークレットキー | 同上 |
| `AWS_S3_BUCKET` | Yes | 動画保存先 S3 バケット名 | AWS コンソール → S3 |
| `AWS_CLOUDFRONT_URL` | Yes | CloudFront 配信ドメイン | AWS コンソール → CloudFront → ディストリビューション |
| `AWS_MEDIACONVERT_ROLE_ARN` | Yes | MediaConvert 用 IAM ロール ARN | AWS コンソール → IAM → ロール |
| `AWS_MEDIACONVERT_TEMPLATE_LANDSCAPE` | Yes | 横長動画用変換テンプレート ARN | AWS コンソール → MediaConvert → ジョブテンプレート |
| `AWS_MEDIACONVERT_TEMPLATE_PORTRAIT` | Yes | 縦長動画用変換テンプレート ARN | 同上 |
| `AWS_SNS_TOPIC_ARN` | No | MediaConvert 完了通知用 SNS トピック | AWS コンソール → SNS → トピック |

#### Google Tag Manager

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `NEXT_PUBLIC_GTM_ID` | No | GTM コンテナ ID | Google Tag Manager → コンテナ管理画面（`GTM-XXXXXXX`） |

#### SendGrid（メール送信）

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `SENDGRID_API_KEY` | Yes | SendGrid API キー | SendGrid Dashboard → Settings → API Keys |
| `SENDGRID_FROM_EMAIL` | Yes | 送信元メールアドレス | SendGrid で認証済みのドメイン/アドレス |
| `SENDGRID_FROM_NAME` | Yes | 送信元表示名 | 任意（例: `JOBTV運営事務局`） |

#### Slack（Webhook 通知）

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `SLACK_EMAIL_WEBHOOK_URL` | No | メール送信時の Slack 通知 | Slack App → Incoming Webhooks |
| `SLACK_SIGNUP_WEBHOOK_URL` | No | 会員登録時の Slack 通知 | 同上 |
| `SLACK_EVENT_RESERVATION_WEBHOOK_URL` | No | イベント予約時の Slack 通知 | 同上 |

#### Google Sheets（通知の転記）

詳細は [signup-notification.md](signup-notification.md)。

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | No | サービスアカウントのメール | GCP コンソール → IAM → サービスアカウント |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | No | サービスアカウントの秘密鍵 | サービスアカウントキー JSON の `private_key` |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | No | 会員登録通知用スプレッドシート ID | スプレッドシート URL の `/d/` 以降 |
| `GOOGLE_SHEETS_SHEET_NAME` | No | 会員登録通知用シート名 | デフォルト: `account` |
| `GOOGLE_SHEETS_EVENT_RESERVATION_SPREADSHEET_ID` | No | イベント予約通知用スプレッドシート ID | 同上 |
| `GOOGLE_SHEETS_EVENT_RESERVATION_SHEET_NAME` | No | イベント予約通知用シート名 | デフォルト: `Sheet1` |

#### LINE 連携

詳細は [line-integration.md](line-integration.md)。

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `LINE_LOGIN_CHANNEL_ID` | Yes | LINE Login チャネル ID | LINE Developers → チャネル基本設定 |
| `LINE_LOGIN_CHANNEL_SECRET` | Yes | LINE Login チャネルシークレット | 同上 |
| `LINE_CHANNEL_ACCESS_TOKEN` | Yes | Messaging API 長期トークン | LINE Developers → Messaging API 設定 |

#### Cron（定期実行）

詳細は [scheduled-jobs.md](scheduled-jobs.md)。

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `CRON_SECRET` | No | Vercel Cron の Bearer 認証トークン | `openssl rand -hex 32` で生成。Vercel Dashboard にも同じ値を設定 |

#### Basic 認証

詳細は [deployment.md](deployment.md)。

| 変数名 | 必須 | 説明 | 値 |
|--------|------|------|-----|
| `BASIC_AUTH_USER` | No | Basic 認証ユーザー名 | 任意 |
| `BASIC_AUTH_PASSWORD` | No | Basic 認証パスワード | 任意 |
| `BASIC_AUTH_SCOPE` | No | 認証スコープ（`all` / `admin`） | 未設定 = `all` |

#### CAPTCHA（Cloudflare Turnstile）

詳細は [captcha.md](captcha.md)。

| 変数名 | 必須 | 説明 | 取得先 |
|--------|------|------|--------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Turnstile サイトキー（クライアント用） | Cloudflare Dashboard → Turnstile |
| `TURNSTILE_SECRET_KEY` | Yes | Turnstile シークレットキー（サーバー検証用） | 同上 |

#### ローカル開発専用

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `SKIP_ZEROTRUST_CHECK` | No | `true` で Cloudflare Zero Trust チェックをスキップ。**STG/PROD には設定しない** |

#### ログ

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `LOG_LEVEL` | No | ログレベル（`debug` / `info` / `warn` / `error`）。未設定時は開発: `debug`、本番: `info` |

### 2.4 event-system 環境変数（`apps/event-system/.env.local`）

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service_role key |
| `SUPABASE_JWT_SECRET` | Yes | JWT 検証用シークレット |
| `NEXT_PUBLIC_SITE_URL` | Yes | サイト URL |
| `BASIC_AUTH_USER` | No | Basic 認証ユーザー名 |
| `BASIC_AUTH_PASSWORD` | No | Basic 認証パスワード |
| `BASIC_AUTH_SCOPE` | No | 認証スコープ |
| `CLOUDFLARE_ZERO_TRUST_ENABLED` | No | Zero Trust を有効化 |
| `SKIP_ZEROTRUST_CHECK` | No | Zero Trust チェックをスキップ |

### 2.5 agent-manager 環境変数（`apps/agent-manager/.env.local`）

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |
| `SUPABASE_JWT_SECRET` | Yes | JWT 検証用シークレット |
| `NEXT_PUBLIC_SITE_URL` | Yes | サイト URL |
| `BASIC_AUTH_USER` | No | Basic 認証ユーザー名 |
| `BASIC_AUTH_PASSWORD` | No | Basic 認証パスワード |
| `BASIC_AUTH_SCOPE` | No | 認証スコープ |
| `CLOUDFLARE_ZERO_TRUST_ENABLED` | No | Zero Trust を有効化 |
| `SKIP_ZEROTRUST_CHECK` | No | Zero Trust チェックをスキップ |

### 2.6 自動設定される環境変数（.env 不要）

以下は Next.js / Vercel / CI が自動設定するため、.env に記載しない。

| 変数名 | 設定者 |
|--------|--------|
| `NODE_ENV` | Next.js |
| `CI` | CI/CD 環境 |
| `VERCEL_ENV` | Vercel（`production` / `preview` / `development`） |
| `VERCEL_URL` | Vercel |
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel |

### 2.7 注意事項

- `NEXT_PUBLIC_` プレフィックス付きの変数はクライアントに公開される。**シークレットには絶対に付けない**
- `.env.staging` / `.env.production` は管理台帳。実際の STG / PROD 環境変数は **Vercel Dashboard → Settings → Environment Variables** に設定する
- 環境別の設定方針は [deployment.md](deployment.md) を参照

## 3. Supabase のセットアップ

### 3.1 Supabase CLI のインストール

```bash
npm install -g supabase
```

### 3.2 プロジェクトへのリンク（STG 用）

開発時は常に **STG** プロジェクトにリンクする。PROD への操作は `pnpm db:push:prod` で明示的に行う。

```bash
# monorepoのルートディレクトリで実行（STG 用）
pnpm db:link:stg
```

### 3.3 ログイン

```bash
supabase login
```

ブラウザが開き、Supabase にログインします。

### 3.4 マイグレーションの適用

```bash
# リモートデータベースにマイグレーションを適用
supabase db push
```

### 3.5 型定義の生成

マイグレーション適用後、型定義を生成します：

```bash
# monorepoルートで実行
pnpm types
```

このコマンドは`packages/shared/types/database.types.ts`を自動生成します。

## 4. 開発サーバーの起動

日常の開発では [monorepo.md](monorepo.md) の開発ワークフローも参照。

### 全アプリを並列起動

```bash
pnpm dev
```

各アプリは以下のポートで起動します：

- **jobtv**: http://localhost:3000
- **event-system**: http://localhost:3001
- **agent-manager**: http://localhost:3002

### 個別のアプリを起動

```bash
# agent-managerのみ
pnpm --filter agent-manager dev

# event-systemのみ
pnpm --filter event-system dev

# jobtvのみ
pnpm --filter jobtv dev
```

## 5. ビルドの確認

```bash
# 全アプリをビルド
pnpm build

# 個別のアプリをビルド
pnpm --filter agent-manager build
pnpm --filter event-system build
pnpm --filter jobtv build
```

## トラブルシューティング

### pnpm コマンドが見つからない

すべてのコマンドで`npx pnpm@latest`を使用してください：

```bash
npx pnpm@latest install
npx pnpm@latest dev
```

### Supabase の環境変数エラー

- 環境変数が各アプリの`.env.local`に正しく設定されているか確認
- ルートの`.env.local`に Supabase の環境変数を設定していないか確認
- 環境変数の値にスペースや改行が含まれていないか確認

### ビルドエラー

```bash
# キャッシュをクリア
pnpm clean
rm -rf node_modules
pnpm install

# 型定義を再生成
pnpm types
```

### ポートが既に使用されている

他のプロセスがポートを使用している場合：

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

### マイグレーションエラー

```bash
# マイグレーション履歴を確認
supabase migration list

# ローカルデータベースをリセット（開発環境のみ）
supabase db reset
```

## 次のステップ

セットアップが完了したら：

1. [アプリケーション概要](./apps.md)で各アプリの機能を確認
2. [データベース管理](./database.md)でマイグレーション管理を学習
3. [コーディング規約](./code-style.md)を確認

## 参考リンク

- [Supabase ドキュメント](https://supabase.com/docs)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [pnpm ドキュメント](https://pnpm.io/)
- [Turborepo ドキュメント](https://turbo.build/repo/docs)
