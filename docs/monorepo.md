# Monorepo 構成・開発手順

このドキュメントは、モノレポの構成・パッケージ・開発ワークフロー・環境変数の正本です。アプリ一覧・技術スタックの詳細は [apps.md](apps.md) を参照する。

---

## プロジェクト概要

Next.js ベースの Monorepo。3 アプリ: **jobtv** (3000)、**event-system** (3001)、**agent-manager** (3002)。詳細は [apps.md](apps.md)。

## 構成

### パッケージマネージャー・ツール

- **パッケージマネージャー**: pnpm
- **タスクランナー**: Turbo
- **ワークスペース**: `pnpm-workspace.yaml` で定義。`apps/*`（各アプリ）、`packages/shared`（共通パッケージ）

### 共通パッケージ（@jobtv-app/shared）

- **Supabase**: `@jobtv-app/shared/supabase/server`、`/client`、`/admin`
- **型定義**: `@jobtv-app/shared/types`（database、database-extensions、common-helpers）
- **認証**: `@jobtv-app/shared/auth`、`@jobtv-app/shared/auth/client`
- **ユーティリティ**: `@jobtv-app/shared/utils/dev-config`、`/cn`、`/validation`

各アプリの `lib/supabase/` で共通パッケージから再エクスポートする（例: `lib/supabase/server.ts` で `createClient` を再エクスポート）。

## 開発ワークフロー

### ブランチ運用

開発は `develop` ブランチを起点に行う（デフォルトブランチ）。

```
feature/* ──PR──▶ develop ──PR──▶ staging ──PR──▶ main
                  (統合)          (STG デプロイ)    (PROD デプロイ)
```

```bash
# 機能開発の開始
git checkout develop && git pull
git checkout -b feature/機能名

# 開発・コミット後
git push -u origin feature/機能名
# GitHub で PR 作成: feature/機能名 → develop
```

ブランチ戦略・プロモーションフロー・ホットフィックスの詳細は [deployment.md](deployment.md) を参照。

### 開発サーバー

```bash
pnpm dev                    # 全アプリ並列起動
pnpm --filter jobtv dev     # 個別起動
```

### ビルド

```bash
pnpm build
pnpm --filter jobtv build
```

### マイグレーション・型定義

- マイグレーションは `jobtv-app/supabase/migrations/` で一元管理。[database.md](database.md) を参照。
- 型定義の生成: `pnpm types`（`packages/shared/types/database.types.ts` を生成）

## 環境変数

- **共通設定**: ルートの `.env.local`（開発用など）
- **アプリ固有**: `apps/{app-name}/.env.local`（Supabase URL・キーなど）

注意: Supabase の環境変数は各アプリで個別に設定する。ルートに共通設定すると問題が出る場合がある。`NEXT_PUBLIC_SITE_URL` はプロトコルを含めない。シークレットは `NEXT_PUBLIC_` を付けない。開発環境用（`SKIP_ZEROTRUST_CHECK` 等）は `@jobtv-app/shared/utils/dev-config` で統一。

## ディレクトリ構成

- **各アプリ**: `app/`、`components/`（`ui/`）、`lib/`（`actions/`、`supabase/`）、`types/`、`hooks/`、`utils/`、`package.json`
- **共通パッケージ**: `packages/shared/` に actions、auth、supabase、types、utils

## ベストプラクティス

1. 複数アプリで使う機能は `packages/shared` に配置
2. データベース型は `packages/shared/types` で一元管理
3. 全アプリで同じ Supabase クライアント実装を使用
4. 共通設定とアプリ固有設定を分離
5. 共通パッケージの変更が全アプリに影響することを意識する
