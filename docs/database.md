# データベース管理

このドキュメントでは、JobTV App Monorepo のデータベース管理とマイグレーション手順を説明します。

## プロジェクト情報

- **Supabase Project ID**: `tdewumilkltljbqryjpg`
- **管理場所**: `jobtv-app/supabase/migrations/`
- **対象アプリ**: agent-manager、event-system、jobtv（すべて同じデータベースを共有）

## セットアップ

### 1. Supabase CLI のインストール

```bash
npm install -g supabase
```

### 2. プロジェクトへのリンク

```bash
# monorepoのルートディレクトリで実行
cd /path/to/jobtv-app
supabase link --project-ref tdewumilkltljbqryjpg
```

### 3. ログイン

```bash
supabase login
```

ブラウザが開き、Supabase にログインします。

## マイグレーション管理

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

## 標準ワークフロー

1. **マイグレーションファイルの作成**

   ```bash
   supabase migration new <name>
   ```

2. **SQL の記述**

   - `supabase/migrations/`に生成されたファイルに SQL を記述

3. **マイグレーションの適用**

   ```bash
   supabase db push
   ```

4. **型定義の更新**

   ```bash
   pnpm types
   ```

5. **変更をコミット**

   ```bash
   git add supabase/migrations packages/shared/types/database.types.ts
   git commit -m "feat: add new migration"
   ```

## マイグレーション履歴

### agent-manager からの移行 (2025 年 11 月〜12 月)

- `20251127104334_remote_schema.sql`
- `20251201161218_recruitment_system.sql`
- `20251201161219_fix_rls_policies.sql`
- `20251201185543_update_companies_table.sql`
- `20251201190000_update_candidates_table.sql`
- `20251201192000_update_candidates_table_remove_fields.sql`
- `20251202000000_add_graduation_year_to_job_postings.sql`
- `20251202000001_remove_draft_from_job_status.sql`
- `20251202000002_add_available_statuses_to_job_postings.sql`
- `20251202000003_make_graduation_year_required.sql`
- `20251202000004_create_interview_notes.sql`
- `20251203000000_add_updated_fields_to_progress_and_notes.sql`
- `20251203000002_add_interviewer_id_to_interview_notes.sql`
- `20251203000003_update_user_role_enum.sql`
- `20251203000004_add_graduation_year_and_assigned_to_to_candidates.sql`
- `20251203000005_add_name_fields_to_candidates.sql`

### supabase-migration からの移行 (2026 年 1 月)

- `20260120052100_remote_schema.sql`
- `20260120053000_update_rls_to_include_recruiter.sql`
- `20260120060000_allow_recruiter_view_candidates.sql`
- `20260120070000_simplify_user_roles.sql`
- `20260120080000_add_memo_to_ratings.sql`
- `20260125000000_add_event_special_interviews.sql`

### jobtv からの移行 (2026 年 2 月)

- `20260202201656_add_company_profile_fields.sql`
- `20260202201657_create_company_storage_bucket.sql`

## 重要な注意事項

### ⚠️ マイグレーション管理の統一

- **全てのマイグレーションは`jobtv-app/supabase/migrations/`で管理**
- 各アプリ（agent-manager、event-system、jobtv）内には supabase ディレクトリを作成しない
- 新しいマイグレーションは必ず monorepo のルートで作成してください

### 🔄 型定義の同期

- マイグレーション適用後、必ず`pnpm types`を実行
- すべてのアプリが`@jobtv-app/shared/types`から型定義を参照
- 型定義ファイル（`database.types.ts`）の手動編集は禁止

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
