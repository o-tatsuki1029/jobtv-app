# スケジュール配信（Vercel Cron Jobs）

定期実行ジョブの仕組み・設定・運用ルールをまとめる。

---

## 仕組み

Vercel Cron は `vercel.json` の `crons` 設定に基づき、指定スケジュールで対象エンドポイントに GET リクエストを送る。

```
Vercel Cron スケジューラー
  │  スケジュールに従い GET リクエスト
  │  Authorization: Bearer <CRON_SECRET>
  ▼
/api/cron/xxxx (Route Handler)
  │  Bearer トークン検証 → 処理実行
  ▼
レスポンス（結果）
```

### 認証

- Vercel は環境変数 `CRON_SECRET` が設定されていると、リクエストに `Authorization: Bearer <CRON_SECRET>` ヘッダーを自動付与する。
- Route Handler 側でこのトークンを検証し、不正アクセスを防ぐ。
- `CRON_SECRET` が未設定（空）の場合、認証チェックはスキップされる（ローカル開発用）。

---

## 登録済みジョブ

### イベントリマインド通知

| 項目 | 値 |
|------|-----|
| エンドポイント | `GET /api/cron/event-reminder` |
| スケジュール | `0 1 * * *`（毎日 UTC 01:00 = JST 10:00） |
| 実装 | `apps/jobtv/app/api/cron/event-reminder/route.ts` |
| 定義 | `apps/jobtv/vercel.json` |

**処理内容:**

1. `event_reservations`（status = `reserved`）からイベント日が **7日後・3日後・1日後** の予約を取得
2. 各予約の候補者に対してリマインドメール（SendGrid テンプレート）を送信
3. 候補者に `line_user_id` がある場合、LINE プッシュ通知も送信
4. `last_reminder_sent_at` を更新し、同日の重複送信を防止

**関連テーブル:**

| テーブル | 使用カラム |
|----------|-----------|
| `event_reservations` | `status`, `candidate_id`, `last_reminder_sent_at` |
| `events` | `event_date`, `start_time`, `end_time`, `venue_name`, `display_name`, `gathering_time`, `venue_address`, `google_maps_url`, `status` |
| `profiles` | `last_name`, `first_name`, `email` |
| `candidates` | `line_user_id` |

---

### LINE 予約配信

| 項目 | 値 |
|------|-----|
| エンドポイント | `GET /api/cron/line-broadcast` |
| スケジュール | `*/5 * * * *`（5 分間隔） |
| 実装 | `apps/jobtv/app/api/cron/line-broadcast/route.ts` |
| 定義 | `apps/jobtv/vercel.json` |

**処理内容:**

1. `line_broadcast_logs` から `status = 'scheduled'` かつ `scheduled_at <= now()` のレコードを取得
2. 各レコードの `status` を `sending` に更新し、セグメント条件に基づいて対象候補者を取得
3. LINE Messaging API Push で 1 件ずつ送信し、結果を `line_broadcast_deliveries` に記録
4. 完了後に `status` を `sent`（または全件失敗なら `failed`）に更新し、`sent_at` を記録

**関連テーブル:**

| テーブル | 使用カラム |
|----------|-----------|
| `line_broadcast_logs` | `status`, `scheduled_at`, `filters_snapshot`, `messages_snapshot`, `target_count`, `sent_count`, `failed_count`, `blocked_count`, `sent_at` |
| `line_broadcast_deliveries` | `broadcast_log_id`, `candidate_id`, `line_user_id`, `status`, `error_code`, `error_message` |
| `candidates` | `line_user_id` + セグメント条件カラム |
| `profiles` | `last_name`, `first_name`（変数置換用） |

---

### LINE 配信リトライ

| 項目 | 値 |
|------|-----|
| エンドポイント | `GET /api/cron/line-broadcast-retry` |
| スケジュール | `5,20,35,50 * * * *`（15 分間隔、毎時 5/20/35/50 分） |
| 実装 | `apps/jobtv/app/api/cron/line-broadcast-retry/route.ts` |
| 定義 | `apps/jobtv/vercel.json` |

**処理内容:**

1. `line_broadcast_deliveries` から `status = 'failed'` かつ `retry_count < 3` のレコードを取得
2. LINE Messaging API Push で再送信を試行
3. 成功時は `status` を `success` に更新、失敗時は `retry_count` をインクリメントし `last_attempted_at` を更新
4. 親の `line_broadcast_logs` の `sent_count` / `failed_count` を再集計

**関連テーブル:**

| テーブル | 使用カラム |
|----------|-----------|
| `line_broadcast_deliveries` | `status`, `retry_count`, `last_attempted_at`, `error_code`, `error_message`, `line_user_id` |
| `line_broadcast_logs` | `sent_count`, `failed_count`, `blocked_count` |

---

### ストレージクリーンアップ

| 項目 | 値 |
|------|-----|
| エンドポイント | `GET /api/cron/storage-cleanup` |
| スケジュール | `0 3 * * *`（毎日 UTC 03:00 = JST 12:00） |
| 実装 | `apps/jobtv/app/api/cron/storage-cleanup/route.ts` |
| 定義 | `apps/jobtv/vercel.json` |

**処理内容:**

1. `storage_cleanup_schedules` から `status = 'pending'` かつ `scheduled_at <= now()` のスケジュールを取得
2. 各スケジュールに対してフルスキャンを実行:
   - DB の全テーブルからストレージ参照 URL を収集
   - S3 `companies/`, `admin/` プレフィックスとSupabase `company-assets` バケットをリスト
   - 指定期間内で DB に参照がないファイルを孤立と判定 → `storage_deletion_queue` に登録
3. `storage_deletion_queue` から `status = 'approved'` のアイテムを取得し、実際の削除を実行

**関連テーブル:**

| テーブル | 使用カラム |
|----------|-----------|
| `storage_cleanup_schedules` | `status`, `scheduled_at`, `scan_from`, `scan_to`, `result` |
| `storage_deletion_queue` | `status`, `storage_type`, `bucket`, `path`, `is_prefix` |

**注意:**
- 孤立ファイルは自動削除されず、`storage_deletion_queue` に `pending` ステータスで登録されます
- 実際の削除には管理画面 (`/admin/storage-cleanup`) での承認が必要です
- 管理画面から即時スキャンも実行可能です

---

## 環境変数

| 変数名 | 用途 | 取得方法 |
|--------|------|----------|
| `CRON_SECRET` | Cron API の Bearer 認証トークン | `openssl rand -hex 32` で生成 |

### 環境別の設定

| 環境 | 設定方法 | `CRON_SECRET` |
|------|----------|---------------|
| ローカル | `apps/jobtv/.env.local` | 空（認証スキップ） |
| STG | Vercel Dashboard（Preview スコープ） | 設定必須 |
| PROD | Vercel Dashboard（Production スコープ） | 設定必須 |

> **重要**: `.env.staging` / `.env.production` は管理台帳。実際の設定先は **Vercel Dashboard → Settings → Environment Variables**。

---

## 設定手順

### 1. vercel.json にジョブを定義

```jsonc
// apps/jobtv/vercel.json
{
  "crons": [
    {
      "path": "/api/cron/event-reminder",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### 2. Route Handler を実装

```typescript
// apps/jobtv/app/api/cron/xxxx/route.ts
export async function GET(request: NextRequest) {
  // CRON_SECRET で認証
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 処理
}
```

### 3. Vercel Dashboard で CRON_SECRET を設定

1. Vercel Dashboard → jobtv プロジェクト → **Settings → Environment Variables**
2. `CRON_SECRET` を追加
3. **Preview** スコープに STG 用の値を設定
4. **Production** スコープに PROD 用の値を設定
5. 再デプロイして反映

---

## ローカルでのテスト

```bash
# 認証なし（CRON_SECRET が空のため）
curl http://localhost:3000/api/cron/event-reminder

# 認証ありで確認したい場合は .env.local に CRON_SECRET を設定し
curl -H "Authorization: Bearer <設定した値>" http://localhost:3000/api/cron/event-reminder
```

---

## ジョブ追加時のチェックリスト

- [ ] `apps/jobtv/vercel.json` の `crons` にエントリ追加
- [ ] Route Handler を `app/api/cron/` 配下に実装（`CRON_SECRET` 認証を含む）
- [ ] `.env.local` / `.env.staging` / `.env.production` に必要な環境変数を追記
- [ ] Vercel Dashboard に環境変数を設定（該当スコープ）
- [ ] このドキュメントの「登録済みジョブ」セクションに追記
