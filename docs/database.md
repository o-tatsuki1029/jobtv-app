# データベース管理

このドキュメントでは、JobTV App Monorepo のデータベース管理とマイグレーション手順を説明します。

## プロジェクト情報

- **Supabase Project ID**: `tdewumilkltljbqryjpg`
- **管理場所**: `jobtv-app/supabase/migrations/`
- **対象アプリ**: agent-manager、event-system、jobtv（すべて同じデータベースを共有）
- **一元管理**: 全マイグレーションは `supabase/migrations/` で管理。型は `pnpm types` で生成し、`database.types.ts` は手動編集しない。

Supabase の初回セットアップ（CLI インストール・link・login）は [setup.md](setup.md) を参照。

## マイグレーション管理

通常の流れ: 新規作成 → SQL 記述 → `supabase db push` → `pnpm types` → コミット（[型定義の生成](#型定義の生成) 参照）。以下に各ステップの詳細を記載する。

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

# プロジェクトIDを確認
supabase link --project-ref tdewumilkltljbqryjpg

# 型定義を再生成
pnpm types
```

### プロジェクトのリンクが切れた場合

```bash
# 再リンク
supabase link --project-ref tdewumilkltljbqryjpg

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
