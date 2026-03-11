# セットアップガイド

このドキュメントでは、JobTV App Monorepo の詳細なセットアップ手順を説明します。

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

### 2.1 共通環境変数（ルート）

ルートディレクトリに`.env.local`を作成：

```bash
# 開発環境用の設定（全アプリ共通）
SKIP_ZEROTRUST_CHECK=true
NODE_TLS_REJECT_UNAUTHORIZED=0
```

**注意**: Supabase の環境変数はルートに設定しないでください。各アプリで個別に設定する必要があります。

### 2.2 各アプリの環境変数

#### agent-manager

`apps/agent-manager/.env.local`を作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tdewumilkltljbqryjpg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=your-password
```

#### event-system

`apps/event-system/.env.local`を作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tdewumilkltljbqryjpg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=your-password
```

#### jobtv

`apps/jobtv/.env.local`を作成：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tdewumilkltljbqryjpg.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=localhost:3000

# AWS設定（動画機能を使用する場合）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=jobtv-videos-stg
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::your-account:role/MediaConvertServiceRole
AWS_MEDIACONVERT_TEMPLATE_LANDSCAPE=arn:aws:mediaconvert:region:account:jobTemplates/template-name
AWS_MEDIACONVERT_TEMPLATE_PORTRAIT=arn:aws:mediaconvert:region:account:jobTemplates/template-name
AWS_CLOUDFRONT_URL=https://your-cloudfront-domain.cloudfront.net
```

**重要な注意事項**:

- `NEXT_PUBLIC_SITE_URL`はプロトコル（`http://`や`https://`）を含めないでください
- AWS 設定は動画アップロード機能を使用する場合のみ必要です

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
3. [コーディング規約](../.cursor/rules/)を確認

## 参考リンク

- [Supabase ドキュメント](https://supabase.com/docs)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [pnpm ドキュメント](https://pnpm.io/)
- [Turborepo ドキュメント](https://turbo.build/repo/docs)
