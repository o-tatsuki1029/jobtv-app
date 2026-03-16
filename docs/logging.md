# ロギング戦略

## 概要

Pino（OSS）+ Vercel ログ + Supabase `audit_logs` テーブルで完結。外部サービスなし。

## ロガー

### 共有モジュール

- `packages/shared/utils/logger.ts`: `createLogger(app)` を提供
- 各アプリの `lib/logger.ts` でインスタンス化して使用

### ログレベルガイドライン

| Level | 用途 | 例 |
|-------|------|-----|
| `error` | 操作失敗、ユーザー影響あり | DB クエリ失敗、SendGrid エラー |
| `warn` | 機能低下だがユーザー影響なし | Slack 通知失敗 |
| `info` | 重要なビジネスイベント | メール送信成功、管理者操作 |
| `debug` | 診断情報 | クエリパラメータ |

### 使い方

```typescript
import { logger } from "@/lib/logger";

// エラーログ（err キーで Error オブジェクトを渡す）
logger.error({ action: "getCompanyProfile", err: error }, "企業プロフィール取得失敗");

// 情報ログ
logger.info({ action: "sendEmail", to: email }, "メール送信成功");

// デバッグログ
logger.debug({ query: params }, "検索パラメータ");
```

### 環境別動作

| 環境 | レベル | 出力 |
|------|--------|------|
| development | debug | pino-pretty（カラー付き） |
| production | info | 構造化 JSON（Vercel ログビューアで閲覧） |

`LOG_LEVEL` 環境変数で上書き可能。

## エラーバウンダリ

各アプリのルートに `error.tsx` / `global-error.tsx` を配置。React のエラーを Server Action 経由でサーバーログに送信。

- `apps/*/app/error.tsx`: ルート配下のエラーキャッチ
- `apps/*/app/global-error.tsx`: ルートレイアウトのエラーキャッチ
- `apps/*/lib/actions/error-report-actions.ts`: クライアントエラーのサーバー送信

## 監査ログ（audit_logs）

管理者操作の履歴を `audit_logs` テーブルに記録。詳細は `docs/database-domain.md` の「監査ログ」セクション参照。

### ヘルパー

```typescript
import { logAudit } from "@jobtv-app/shared/utils/audit";

// Server Action 内で使用（await しない：本体処理をブロックしない）
logAudit({
  userId: user.id,
  action: "job.approve",
  category: "content_review",
  resourceType: "job_postings_draft",
  resourceId: draftId,
  app: "jobtv",
  metadata: { companyId, jobTitle },
});
```

### カテゴリ一覧

| カテゴリ | 用途 |
|----------|------|
| `content_review` | コンテンツ承認・却下 |
| `account` | アカウント管理（作成・削除・CSV インポート等） |
| `content_edit` | 管理者によるコンテンツ直接編集（LP コンテンツ・アンバサダー・しゅんダイアリー等） |
| `access` | アクセス制御（代理ログイン等） |
| `matching` | マッチング実行 |
| `hero` | トップページヒーロー管理 |
| `auth` | 認証イベント |
| `storage` | ストレージ削除承認・実行・スキャン |
| `line` | LINE 配信送信・スケジュール・キャンセル・テンプレート・リッチメニュー |
| `notification` | アプリ内通知の作成・更新・削除 |
| `email_template` | メールテンプレート作成・更新・削除 |

### 確認方法

Supabase ダッシュボードの Table Editor、または SQL Editor で以下のクエリを実行：

```sql
-- 直近24時間の全操作
SELECT * FROM audit_logs WHERE created_at > now() - interval '24 hours' ORDER BY created_at DESC;

-- 特定ユーザーの操作履歴
SELECT * FROM audit_logs WHERE user_id = 'xxx' ORDER BY created_at DESC;

-- 承認・却下の履歴
SELECT * FROM audit_logs WHERE category = 'content_review' ORDER BY created_at DESC;
```
