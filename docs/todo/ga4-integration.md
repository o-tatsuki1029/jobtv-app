# GA4 統合設計

## 概要

Google Analytics 4 (GA4) と Google Tag Manager (GTM) を統合し、ユーザー行動を計測する。

## 実装項目

### 1. GTM コンテナ設定

- GTM コンテナ ID を環境変数 `NEXT_PUBLIC_GTM_ID` として管理
- `<Script>` コンポーネントで GTM スニペットを挿入（`afterInteractive`）
- 本番のみ有効化（`NODE_ENV === "production"`）

### 2. GA4 プロパティ

- GA4 プロパティを GTM 経由で設定
- 測定 ID を GTM 変数として管理

### 3. dataLayer push ユーティリティ

```typescript
// lib/analytics/gtm.ts
export function pushEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({ event, ...params });
  }
}
```

### 4. カスタムイベント設計

| イベント名 | トリガー | パラメータ |
|-----------|---------|-----------|
| `page_view` | ページ遷移 | `page_path`, `page_title` |
| `video_play` | 動画再生開始 | `video_id`, `company_id`, `video_title` |
| `video_complete` | 動画再生完了 | `video_id`, `watch_duration` |
| `application_submit` | エントリー送信 | `company_id`, `job_posting_id` |
| `login` | ログイン成功 | `method`, `role` |
| `sign_up` | 会員登録完了 | `method` |

### 5. コンバージョン設定

- エントリー送信をコンバージョンとして設定
- LINE 友だち追加をコンバージョンとして設定

## 優先度

中（トラッキング基盤として重要だが、既存機能には影響しない）

## 前提条件

- GTM コンテナの作成（Google 管理画面）
- GA4 プロパティの作成（Google 管理画面）
