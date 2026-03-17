# JOBTV App Monorepo

agent-manager、event-system、jobtv の 3 つの Next.js アプリケーションを統合した Monorepo です。

## クイックスタート

```bash
# 依存関係のインストール
pnpm install

# 全アプリを並列起動
pnpm dev
```

各アプリは以下のポートで起動します：

- **jobtv**: http://localhost:3000 - 動画就活情報サイト
- **event-system**: http://localhost:3001 - イベント運営システム
- **agent-manager**: http://localhost:3002 - エージェント管理システム

## ドキュメント

- **[セットアップガイド](./docs/setup.md)** - 環境構築の詳細手順
- **[アプリケーション概要](./docs/apps.md)** - 各アプリの機能と技術スタック
- **[データベース管理](./docs/database.md)** - マイグレーション管理
- **[AWS 動画機能](./docs/aws-video.md)** - 動画ストリーミング機能（jobtv）
- **[イベントシステム仕様](./docs/event-specification.md)** - イベントシステムの詳細仕様

## 開発ワークフロー

### 個別のアプリを起動

```bash
pnpm --filter jobtv dev
pnpm --filter event-system dev
pnpm --filter agent-manager dev
```

### ビルド

```bash
# 全アプリをビルド
pnpm build

# 個別のアプリをビルド
pnpm --filter jobtv build
```

### マイグレーション管理

```bash
# 新しいマイグレーションの作成
supabase migration new <migration_name>

# マイグレーションの適用
supabase db push

# 型定義の生成
pnpm types
```

詳細は[データベース管理ドキュメント](./docs/database.md)を参照してください。

## プロジェクト構造

```
jobtv-app/
├── apps/
│   ├── jobtv/              # JOBTVアプリ (port 3000)
│   ├── event-system/       # イベントシステム (port 3001)
│   └── agent-manager/      # エージェント管理 (port 3002)
├── packages/
│   └── shared/             # 共通パッケージ
│       ├── supabase/       # Supabaseクライアント
│       ├── types/          # 型定義
│       ├── auth/           # 認証ヘルパー
│       └── utils/          # ユーティリティ
├── supabase/
│   └── migrations/         # データベースマイグレーション
├── docs/                   # ドキュメント
└── .cursor/rules/          # コーディング規約
```

## 技術スタック

- **フレームワーク**: Next.js 15-16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **パッケージマネージャー**: pnpm
- **タスクランナー**: Turborepo

## 共通パッケージ

`@jobtv-app/shared`パッケージには、以下の共通機能が含まれています：

- Supabase クライアント（サーバー/クライアント/管理者）
- 型定義（データベース型、拡張型、共通ヘルパー型）
- 認証ヘルパー
- ユーティリティ関数

## 環境変数

各アプリの`.env.local`に以下を設定してください：

```bash
# Supabase設定（各アプリで個別に設定）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key

# その他のアプリ固有の環境変数
```

詳細は[セットアップガイド](./docs/setup.md)を参照してください。

## コーディング規約

プロジェクトのコーディング規約は[`.cursor/rules/`](./.cursor/rules/)ディレクトリに定義されています：

- ファイル命名規則
- 型安全性の確保
- コンポーネントの整理
- データフェッチングパターン
- Server Actions 管理
- エラーハンドリング
- Tailwind CSS スタイリング

## 参考リンク

- [Supabase ドキュメント](https://supabase.com/docs)
- [Next.js ドキュメント](https://nextjs.org/docs)
- [pnpm ドキュメント](https://pnpm.io/)
- [Turborepo ドキュメント](https://turbo.build/repo/docs)
