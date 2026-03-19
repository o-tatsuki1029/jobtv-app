# データベース管理

このドキュメントでは、JOBTV App Monorepo のデータベース管理とマイグレーション手順を説明します。

## プロジェクト情報

| 項目 | 値 |
|------|-----|
| **Supabase STG Project ID** | `tdewumilkltljbqryjpg`（ローカル・develop・staging 共通） |
| **Supabase PROD Project ID** | `voisychklptvavokrxox`（本番 `main` ブランチ用） |
| **マイグレーション管理場所** | `supabase/migrations/` |
| **対象アプリ** | jobtv、event-system、agent-manager（すべて同じ DB を共有） |
| **型定義** | `pnpm types` で自動生成 → `packages/shared/types/database.types.ts`（手動編集禁止） |

**原則**: 開発時は常に STG にリンクしておくこと。PROD への push は明示的に `pnpm db:push:prod` で行う。

Supabase の初回セットアップ（CLI インストール・link・login）は [setup.md](setup.md) を参照。

## マイグレーション基点

2026-03-18 に全マイグレーションをリセットし、STG のスキーマダンプを初期マイグレーションとして再設定した。

- **初期マイグレーション**: `20260318000000_initial_schema.sql`（STG スキーマのスナップショット）
- これ以前の個別マイグレーション（129 件）は削除済み
- STG の `schema_migrations` テーブルはリセット済み

> **TODO（手動）**: PROD の `schema_migrations` テーブルも同様にリセットが必要。Supabase Dashboard → SQL Editor で以下を実行すること：
> ```sql
> DELETE FROM supabase_migrations.schema_migrations;
> INSERT INTO supabase_migrations.schema_migrations (version, name)
> VALUES ('20260318000000', 'initial_schema');
> ```

## ヘルパースクリプト

```bash
pnpm db:link:stg       # STG にリンク（通常の開発時）
pnpm db:link:prod      # PROD にリンク
pnpm db:push:stg       # STG にリンク → マイグレーション適用
pnpm db:push:prod      # PROD にリンク → マイグレーション適用
pnpm types             # 型定義を再生成（STG から取得）
```

## マイグレーションワークフロー

### 概要

```
マイグレーション作成 → STG 適用（CLI） → 動作確認 → PR・レビュー
→ Dashboard で手動バックアップ → PROD 適用（CLI） → 型更新 → コミット
```

### Step 1: マイグレーション作成（CLI）

```bash
# STG にリンクされていることを確認
pnpm db:link:stg

# マイグレーションファイルを作成
supabase migration new <migration_name>
```

`supabase/migrations/YYYYMMDDHHMMSS_<migration_name>.sql` が生成される。

### Step 2: SQL を記述

```sql
-- supabase/migrations/20260320000000_add_new_column.sql

ALTER TABLE candidates
ADD COLUMN new_column TEXT;

CREATE INDEX idx_candidates_new_column ON candidates(new_column);
```

### Step 3: STG に適用（CLI）

```bash
pnpm db:push:stg
```

### Step 4: STG で動作確認

- アプリの動作確認（主要画面・API）
- RLS ポリシーの動作確認
- データ整合性の確認

### Step 5: PR 作成・レビュー

```bash
git add supabase/migrations/
git commit -m "add migration: <name>"
# GitHub で PR 作成 → レビューチェックリスト確認 → マージ
```

### Step 6: PROD 適用前バックアップ（手動 — Dashboard）

> **この手順は Supabase Dashboard で手動実行する。CLI では実行できない。**

1. [Supabase Dashboard](https://supabase.com/dashboard) → PROD プロジェクト → **Database** → **Backups**
2. **Create backup** をクリック
3. バックアップ完了を確認してから次のステップへ進む

### Step 7: PROD に適用（CLI）

```bash
pnpm db:push:prod
```

> **注意**: 実行後は PROD にリンクされた状態になる。開発に戻る際は必ず `pnpm db:link:stg` で STG に戻すこと。

### Step 8: PROD 適用後の検証

```bash
# マイグレーション状態を確認
supabase migration list
```

- アプリの動作確認（主要画面・API）

### Step 9: STG にリンクを戻す（CLI）

```bash
pnpm db:link:stg
```

### Step 10: 型定義更新・コミット（CLI）

```bash
pnpm types
git add packages/shared/types/database.types.ts
git commit -m "update database types"
```

### Step 11: ドキュメント更新

テーブル・用語・振る舞いに変更があれば `docs/database-domain.md` を更新する（CLAUDE.md の指示に従う）。

## マイグレーション SQL レビューチェックリスト

PR レビュー時に確認する項目：

- [ ] **後方互換性**: 既存データを破壊しないか（カラム削除前にバックフィル済みか）
- [ ] **RLS**: 新テーブルに RLS が有効か、既存ポリシーに影響しないか
- [ ] **インデックス**: WHERE/JOIN 対象カラムにインデックスがあるか
- [ ] **NOT NULL 制約**: DEFAULT 値付きか、既存データに NULL がないか確認済みか
- [ ] **FK 制約**: ON DELETE の挙動が適切か（CASCADE / SET NULL / RESTRICT）
- [ ] **ENUM 変更**: `ADD VALUE` は別トランザクション。削除は新 ENUM 作成 + カラム移行
- [ ] **ロック影響**: 大テーブルの ALTER は長時間ロックを引き起こさないか
- [ ] **docs/database-domain.md 更新**: テーブル・用語・振る舞いに変更があれば更新されているか
- [ ] **シード/マスターデータ**: 新環境で必要なデータがマイグレーションに含まれているか

## 本番データベース変更ルール

### 基本原則

- PROD DB への変更は**マイグレーションファイル経由（`pnpm db:push:prod`）のみ**
- すべての変更は **STG で検証済み** であること
- マイグレーションは**不可逆**として扱う。ロールバックが必要な場合は逆方向の新規マイグレーションを作成する

### 禁止操作

| 操作 | 理由 | 代替手段 |
|------|------|---------|
| Dashboard からの直接 SQL 実行 | 履歴が残らない、STG と差分が生じる | マイグレーションファイルを作成 |
| `DROP TABLE` 単体 | データ消失・FK 破壊 | 新テーブルにデータ移行後、段階的に削除 |
| `DROP COLUMN`（バックフィルなし） | データ消失 | 先にバックフィルマイグレーション → 次のマイグレーションで削除 |
| `TRUNCATE` on PROD | 全データ消失 | 条件付き DELETE + WHERE |
| RLS の無効化 (`DISABLE ROW LEVEL SECURITY`) | セキュリティホール | ポリシーの修正で対応 |
| `supabase db reset` on PROD | 全データ消失 | 絶対禁止 |
| PROD リンク状態での `supabase migration new` | 意図しない PROD 操作リスク | 常に STG リンクで開発 |

### 破壊的変更の安全な実行手順

テーブル削除・カラム削除・ENUM 変更など破壊的変更は **2段階マイグレーション** で行う：

**Step 1（準備マイグレーション）**:
- 新テーブル/カラムを作成
- データをバックフィル
- アプリコードを新構造に対応させてデプロイ

**Step 2（クリーンアップマイグレーション — 次回以降）**:
- 旧テーブル/カラムを削除
- Step 1 が PROD で安定稼働してから実行

### 自動ガード（Claude Code hooks）

禁止操作は Claude Code の PreToolUse hook で物理的にブロックされる。

**ガードスクリプト**: `.claude/hooks/prod-guard.sh`
**設定ファイル**: `.claude/settings.json`

| ブロック対象 | トリガー | 理由 |
|-------------|---------|------|
| `supabase db reset` | Bash コマンド | PROD リンク時に実行すると全データ消失 |
| PROD への直接 SQL 実行 | `mcp__supabase__execute_sql` | 履歴が残らない・STG と差分が生じる |
| PROD への MCP マイグレーション適用 | `mcp__supabase__apply_migration` | `pnpm db:push:prod` を使うこと |

> **注意**: ガードは PROD に対する AI（Claude Code）経由の操作をブロックする。STG への操作はブロックしない。Dashboard や CLI 直接操作は対象外のため、運用ルールの遵守も必要。

## 手動操作が必要な場面まとめ

以下の操作は CLI やマイグレーションでは実行できず、**Supabase Dashboard で手動実行**する必要がある。

| 操作 | 場所 | タイミング |
|------|------|-----------|
| PROD バックアップ作成 | Dashboard → Database → Backups | PROD マイグレーション適用前 |
| PITR による復旧 | Dashboard → Database → Backups | インシデント発生時 |
| 初期 admin ユーザー作成 | Dashboard → Authentication → Users | 新環境セットアップ時 |
| `profiles.role` を `admin` に設定 | Dashboard → SQL Editor（STG のみ）or Table Editor | admin ユーザー作成後 |
| Auth Hook（send_email）の URI 設定 | Dashboard → Auth → Hooks | 新環境セットアップ時 |
| Site URL / Redirect URLs 設定 | Dashboard → Auth → URL Configuration | 新環境セットアップ時 |
| MFA（TOTP）の有効化 | Dashboard → Auth → MFA | 新環境セットアップ時 |
| `schema_migrations` テーブルの手動修正 | Dashboard → SQL Editor | マイグレーションリセット時（極めて稀） |

## バックアップと復旧

### 定期バックアップ

- Supabase Pro プランの自動バックアップ（日次）を利用
- PITR（Point-in-Time Recovery）が有効であることを確認

### マイグレーション前の手動バックアップ（手動 — Dashboard）

1. Supabase Dashboard → Database → Backups → 手動バックアップを作成
2. バックアップ完了を確認してから `pnpm db:push:prod` を実行

### 復旧手順

1. **軽微な問題**（カラム追加の取り消し等）: 逆方向のマイグレーションを作成して適用
2. **重大な問題**（データ破損等）: Supabase Dashboard → Backups → 該当時点に復元（手動）
3. **復旧後**: `supabase migration list` で PROD のマイグレーション状態を確認し、必要に応じてローカルの履歴と同期

### 緊急対応（インシデント時）

1. **即座にアプリの動作確認** — エラーログ・ユーザー影響を確認
2. **ロールバック判断**:
   - アプリが動作する → 逆マイグレーションで対応
   - アプリが停止 → Supabase Dashboard の Backups から PITR で復元（手動）
3. **復旧後**: 原因分析 → 再発防止策 → docs 更新

## 型定義の生成

マイグレーション適用後、必ず型定義を更新する：

```bash
pnpm types
```

生成ファイル: `packages/shared/types/database.types.ts`

```typescript
import type { Database, Tables } from "@jobtv-app/shared/types";

type Candidate = Tables<"candidates">;
```

### 型定義の分類と配置

- **データベース型（自動生成）**: `packages/shared/types/database.types.ts`。`pnpm types` で生成。手動編集禁止。
- **データベース拡張型（共通）**: `packages/shared/types/database-extensions.ts`。複数アプリで共有する拡張型。
- **共通ヘルパー型**: `packages/shared/types/common-helpers.ts`。
- **アプリ固有型**: `apps/{app-name}/types/*.types.ts`。
- **コンポーネント単位の型**: コンポーネントファイル内または同ディレクトリの `*.types.ts`。

### 型の配置判断基準

- データベース型 → 自動生成の `database.types.ts`
- 複数アプリで使用 → `database-extensions.ts`
- 特定アプリのみ → `apps/{app-name}/types/*.types.ts`
- ローカル（1〜2 コンポーネント）→ コンポーネントファイル内

## Supabase クライアントの使用

### クライアントの配置

各アプリの `lib/supabase/` で共通パッケージから再エクスポートする：

- `lib/supabase/server.ts` → `export { createClient } from "@jobtv-app/shared/supabase/server"`
- `lib/supabase/client.ts` → `export { createClient } from "@jobtv-app/shared/supabase/client"`

### クライアントの選択

- **Server Components**: `@/lib/supabase/server` の `createClient()` を使用
- **Server Actions**: サーバークライアント（`@/lib/supabase/server`）を使用
- **Client Components**: 必要に応じて `@/lib/supabase/client` の `createClient()` を使用

### クライアントの作成ルール

- グローバル変数に Supabase クライアントを置かない
- 各関数/コンポーネント内で新しいクライアントインスタンスを作成する
- Fluid compute 利用時は常に新しいクライアントを作成する

### 使用例

```typescript
// Server Component
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("candidates").select("*");
  return <div>{/* ... */}</div>;
}

// Server Action
"use server";
import { createClient } from "@/lib/supabase/server";

export async function createCandidate(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("candidates")
    .insert({ name: formData.get("name") });
  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

// Client Component
"use client";
import { createClient } from "@/lib/supabase/client";
// 各関数内で createClient() を呼び、useEffect 等で利用
```

## トラブルシューティング

### マイグレーションが失敗する場合

```bash
# マイグレーション履歴を確認
supabase migration list

# リモートスキーマとの差分を確認
supabase db diff

# 必要に応じてローカル開発環境をリセット（開発環境のみ）
supabase db reset
```

### 型定義が更新されない場合

```bash
# STG にリンク（型生成は STG から）
pnpm db:link:stg

# 型定義を再生成
pnpm types
```

### プロジェクトのリンクが切れた場合

```bash
# STG に再リンク（開発時のデフォルト）
pnpm db:link:stg

# ログイン状態を確認
supabase login
```

## ベストプラクティス

### マイグレーションファイルの命名

- 明確で説明的な名前を使用
- 動詞で始める（例: `add_`, `update_`, `remove_`, `create_`）
- スネークケースを使用

良い例：`add_email_column_to_users`, `create_notifications_table`, `update_candidates_status_enum`

悪い例：`migration1`, `fix`, `update`

### SQL の記述

- 各マイグレーションは単一の目的に集中
- ロールバック可能な変更を優先
- インデックスは必要に応じて追加
- コメントで変更の理由を説明

### RLS（Row Level Security）ポリシー

- 新しいテーブルには必ず RLS ポリシーを設定
- ポリシー名は説明的に
- 各ロール（admin, recruiter, candidate）ごとにポリシーを定義

```sql
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all candidates"
ON candidates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

## 関連ドキュメント

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [セットアップガイド](./setup.md)
- [アプリケーション概要](./apps.md)
