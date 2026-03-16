# ユーザーアクティビティログ設計

## 概要

一般ユーザー（candidate / recruiter）の操作ログを記録し、行動分析やサポート対応に活用する。
admin の操作は `audit_logs` テーブルで管理済み。本機能はそれとは別に、エンドユーザーの行動を記録する。

## 実装項目

### 1. user_activity_logs テーブル

```sql
CREATE TABLE user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_action ON user_activity_logs(action);
CREATE INDEX idx_user_activity_created_at ON user_activity_logs(created_at);
```

### 2. logUserActivity ヘルパー

```typescript
// packages/shared/utils/user-activity.ts
export async function logUserActivity(opts: {
  userId?: string;
  action: string;
  category: "browse" | "auth" | "application" | "profile" | "video";
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  // fire-and-forget パターン（audit_logs と同様）
}
```

### 3. カテゴリと対象アクション

| カテゴリ | アクション | 説明 |
|---------|-----------|------|
| `auth` | `login`, `logout`, `signup` | 認証イベント |
| `browse` | `page_view`, `search` | ページ閲覧・検索 |
| `video` | `video_view`, `video_share` | 動画視聴・共有 |
| `application` | `entry_submit`, `entry_view` | エントリー関連 |
| `profile` | `profile_update`, `resume_upload` | プロフィール更新 |

### 4. Server Action 組み込み

- 既存の Server Action にfire-and-forget で `logUserActivity` を追加
- ミドルウェアでのページ閲覧ログは検討中（パフォーマンス影響を評価後）

## 優先度

低（分析・サポート用途であり、コア機能には影響しない）

## 注意事項

- RLS: ユーザー自身のログのみ閲覧可能に設定
- 保持期間: 90日でパージ（Cron ジョブ）
- GDPR/個人情報: ユーザー削除時にログも削除（CASCADE）
