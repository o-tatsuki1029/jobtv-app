# データベース管理

このドキュメントでは、JobTV App Monorepo のデータベース管理とマイグレーション手順を説明します。

## プロジェクト情報

- **Supabase STG Project ID**: `tdewumilkltljbqryjpg`（ローカル・develop・staging 共通）
- **Supabase PROD Project ID**: `voisychklptvavokrxox`（本番 `main` ブランチ用）
- **管理場所**: `jobtv-app/supabase/migrations/`
- **対象アプリ**: agent-manager、event-system、jobtv（すべて同じデータベースを共有）
- **一元管理**: 全マイグレーションは `supabase/migrations/` で管理。型は `pnpm types` で生成し、`database.types.ts` は手動編集しない。
- **開発時は常に STG にリンクしておくこと**。PROD への push は明示的に `pnpm db:push:prod` で行う。

Supabase の初回セットアップ（CLI インストール・link・login）は [setup.md](setup.md) を参照。

## マイグレーション管理

通常の流れ: 新規作成 → SQL 記述 → STG に push → テスト → PROD に push → `pnpm types` → コミット。

### ヘルパースクリプト

```bash
pnpm db:link:stg       # STG にリンク（通常の開発時）
pnpm db:link:prod      # PROD にリンク
pnpm db:push:stg       # STG にリンクしてマイグレーション適用
pnpm db:push:prod      # PROD にリンクしてマイグレーション適用
```

### マイグレーションワークフロー

1. `supabase migration new <name>` で新規作成
2. SQL を記述
3. `pnpm db:push:stg` で STG に適用・テスト
4. STG で動作確認後、`pnpm db:push:prod` で PROD に適用
5. `pnpm types` で型定義を更新
6. コミット

> **注意**: `pnpm db:push:prod` 実行後は自動的に PROD にリンクされる。開発に戻る際は `pnpm db:link:stg` で STG に戻すこと。

以下に各ステップの詳細を記載する。

### 新しいマイグレーションの作成

```bash
# monorepoのルートディレクトリで実行
supabase migration new <migration_name>
```

例:

```bash
supabase migration new add_new_column_to_candidates
```

これにより、`supabase/migrations/`ディレクトリに新しいマイグレーションファイルが作成されます。

### SQL の記述

生成されたマイグレーションファイルに SQL を記述します：

```sql
-- supabase/migrations/20260220000000_add_new_column_to_candidates.sql

-- カラムを追加
ALTER TABLE candidates
ADD COLUMN new_column TEXT;

-- インデックスを作成（必要に応じて）
CREATE INDEX idx_candidates_new_column ON candidates(new_column);
```

### マイグレーションの適用

```bash
# リモートデータベースにマイグレーションを適用
supabase db push
```

### マイグレーション履歴の確認

```bash
# 適用済みマイグレーションの一覧を表示
supabase migration list
```

## 型定義の生成

マイグレーション適用後、必ず型定義を更新してください：

```bash
# monorepoのルートディレクトリで実行
pnpm types
```

このコマンドは以下のファイルを生成します：

- `packages/shared/types/database.types.ts`

生成された型定義は、すべてのアプリから参照されます：

```typescript
import type { Database, Tables } from "@jobtv-app/shared/types";

// テーブルの型を使用
type Candidate = Tables<"candidates">;
```

## 型定義の分類と配置

- **データベース型（自動生成）**: `packages/shared/types/database.types.ts`。ルートで `pnpm types` で生成。手動編集禁止。`Database`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums` など。
- **データベース拡張型（共通）**: `packages/shared/types/database-extensions.ts`。複数アプリで共有する拡張型（例: `CandidateWithProfile`, `JobPostingWithCompany`）。
- **共通ヘルパー型**: `packages/shared/types/common-helpers.ts`。`TableName`, `FormData`, `PaginationInfo`, `ApiResponse`, `User` など。
- **アプリ固有型**: `apps/{app-name}/types/*.types.ts`。そのアプリでのみ使用する型。
- **コンポーネント単位の型**: コンポーネントファイル内または同ディレクトリの `*.types.ts`。1〜2 コンポーネントでしか使わない型はここに定義。

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

## 本番データベース変更ルール

### 1. 基本原則

- PROD DB への変更は**マイグレーションファイル経由のみ**。Dashboard からの直接 SQL 実行・手動スキーマ変更は禁止
- すべての変更は **STG で検証済み** であること
- マイグレーションは**不可逆**として扱う。ロールバックが必要な場合は逆方向の新規マイグレーションを作成する

### 2. 変更フロー（必須手順）

```bash
# 1. マイグレーション作成（STG リンク状態で実行すること）
supabase migration new <name>

# 2. SQL を記述
#    supabase/migrations/YYYYMMDDHHMMSS_<name>.sql を編集

# 3. STG に適用
pnpm db:push:stg

# 4. STG で動作確認（アプリ・RLS・データ整合性）

# 5. コミット → PR 作成 → レビュー（マイグレーション SQL を含む）
git add supabase/migrations/
git commit -m "add migration: <name>"
# GitHub で PR 作成 → レビューチェックリスト確認 → マージ

# 6. staging 環境で最終確認

# 7. PROD 適用前バックアップ
#    Supabase Dashboard → Database → Backups → Create backup
#    ※バックアップ完了を確認してから次へ

# 8. PROD に適用
pnpm db:push:prod

# 9. PROD 適用後の検証
supabase migration list          # マイグレーション状態を確認
#    アプリの動作確認（主要画面・API）

# 10. STG にリンクを戻す（重要：PROD リンクのまま放置しない）
pnpm db:link:stg

# 11. 型定義更新・コミット
pnpm types
git add packages/shared/types/database.types.ts
git commit -m "update database types"
```

### 3. マイグレーション SQL レビューチェックリスト

PR レビュー時に確認する項目：

- [ ] **後方互換性**: 既存データを破壊しないか（カラム削除前にバックフィル済みか）
- [ ] **RLS**: 新テーブルに RLS が有効か、既存ポリシーに影響しないか
- [ ] **インデックス**: WHERE/JOIN 対象カラムにインデックスがあるか
- [ ] **NOT NULL 制約**: DEFAULT 値付きか、既存データにNULLがないか確認済みか
- [ ] **FK 制約**: ON DELETE の挙動が適切か（CASCADE / SET NULL / RESTRICT）
- [ ] **ENUM 変更**: `ADD VALUE` は別トランザクション。削除は新 ENUM 作成 + カラム移行
- [ ] **ロック影響**: 大テーブルの ALTER は長時間ロックを引き起こさないか
- [ ] **docs/database-domain.md 更新**: テーブル・用語・振る舞いに変更があれば更新されているか
- [ ] **シード/マスターデータ**: 新環境で必要なデータがマイグレーションに含まれているか

### 4. 禁止操作

| 操作 | 理由 | 代替手段 |
|------|------|---------|
| Dashboard からの直接 SQL 実行 | 履歴が残らない、STG と差分が生じる | マイグレーションファイルを作成 |
| `DROP TABLE` 単体 | データ消失・FK 破壊 | 新テーブルにデータ移行後、段階的に削除 |
| `DROP COLUMN`（バックフィルなし） | データ消失 | 先にバックフィルマイグレーション → 次のマイグレーションで削除 |
| `TRUNCATE` on PROD | 全データ消失 | 条件付き DELETE + WHERE |
| RLS の無効化 (`DISABLE ROW LEVEL SECURITY`) | セキュリティホール | ポリシーの修正で対応 |
| `supabase db reset` on PROD | 全データ消失 | 絶対禁止 |
| PROD リンク状態での `supabase migration new` | 意図しない PROD 操作リスク | 常に STG リンクで開発 |

### 5. バックアップと復旧

**定期バックアップ**:
- Supabase Pro プランの自動バックアップ（日次）を利用
- PITR（Point-in-Time Recovery）が有効であることを確認

**マイグレーション前の手動バックアップ**:
1. Supabase Dashboard → Database → Backups → 手動バックアップを作成
2. バックアップ完了を確認してから `pnpm db:push:prod` を実行

**復旧手順**:
1. **軽微な問題**（カラム追加の取り消し等）: 逆方向のマイグレーションを作成して適用
2. **重大な問題**（データ破損等）: Supabase Dashboard → Backups → 該当時点に復元
3. **復旧後**: `supabase migration list` で PROD のマイグレーション状態を確認し、必要に応じてローカルの履歴と同期

### 6. 破壊的変更の安全な実行手順

テーブル削除・カラム削除・ENUM 変更など破壊的変更は **2段階マイグレーション** で行う：

**Step 1（準備マイグレーション）**:
- 新テーブル/カラムを作成
- データをバックフィル
- アプリコードを新構造に対応させてデプロイ

**Step 2（クリーンアップマイグレーション — 次回以降）**:
- 旧テーブル/カラムを削除
- Step 1 が PROD で安定稼働してから実行

### 7. 緊急対応（インシデント時）

1. **即座にアプリの動作確認** — エラーログ・ユーザー影響を確認
2. **ロールバック判断**:
   - アプリが動作する → 逆マイグレーションで対応
   - アプリが停止 → Supabase Backups から PITR で復元
3. **復旧後**: 原因分析 → 再発防止策 → docs 更新

### 8. 自動ガード（Claude Code hooks）

禁止操作は Claude Code の PreToolUse hook で物理的にブロックされる。

**ガードスクリプト**: `.claude/hooks/prod-guard.sh`
**設定ファイル**: `.claude/settings.json`

| ブロック対象 | トリガー | 理由 |
|-------------|---------|------|
| `supabase db reset` | Bash コマンド | PROD リンク時に実行すると全データ消失 |
| PROD への直接 SQL 実行 | `mcp__supabase__execute_sql` | 履歴が残らない・STG と差分が生じる |
| PROD への MCP マイグレーション適用 | `mcp__supabase__apply_migration` | `pnpm db:push:prod` を使うこと |

> **注意**: ガードは PROD に対する AI（Claude Code）経由の操作をブロックする。STG への操作はブロックしない。Dashboard や CLI 直接操作は対象外のため、運用ルールの遵守も必要。

## 重要な注意事項

### 📋 DB 解釈ドキュメントの更新

- **DB（マイグレーション・テーブル役割・使用ルール）に変更を加えた際は、必ず `docs/database-domain.md` も修正する。** 用語・テーブル対応・振る舞いの解釈をこの doc に集約しており、実装の拠り所とする。

### 🚀 デプロイメント

- 本番環境へのマイグレーション適用前に必ずバックアップを取得
- ステージング環境でテストしてから本番適用
- マイグレーションは不可逆的な操作なので、慎重に実行

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
# Supabaseへの接続を確認
supabase projects list

# STG にリンク（型生成は STG から。スキーマは PROD と同一）
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

### マイグレーションの順序エラー

マイグレーションファイル名のタイムスタンプが重複している場合：

```bash
# 新しいタイムスタンプでマイグレーションを再作成
supabase migration new <migration_name>
```

## ベストプラクティス

### マイグレーションファイルの命名

- 明確で説明的な名前を使用
- 動詞で始める（例: `add_`, `update_`, `remove_`, `create_`）
- スネークケースを使用

良い例：

- `add_email_column_to_users`
- `create_notifications_table`
- `update_candidates_status_enum`

悪い例：

- `migration1`
- `fix`
- `update`

### SQL の記述

- 各マイグレーションは単一の目的に集中
- ロールバック可能な変更を優先
- インデックスは必要に応じて追加
- コメントで変更の理由を説明

```sql
-- メールアドレスは profiles テーブルにのみ保持する（candidates には持たない）。
-- 候補者のメールは profiles.email を参照し、profiles.candidate_id で candidates と紐付く。
```

### RLS（Row Level Security）ポリシー

- 新しいテーブルには必ず RLS ポリシーを設定
- ポリシー名は説明的に
- 各ロール（admin, recruiter, candidate）ごとにポリシーを定義

```sql
-- RLSを有効化
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- 管理者は全てのレコードを閲覧可能
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
