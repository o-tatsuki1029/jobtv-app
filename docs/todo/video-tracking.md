# 動画視聴トラッキング設計

## 概要

動画の視聴状況（再生回数・視聴時間・完了率）をサーバーサイドで記録し、管理画面で確認可能にする。

## 実装項目

### 1. video_views テーブル

```sql
CREATE TABLE video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id),
  session_id TEXT,
  watch_duration_seconds INTEGER DEFAULT 0,
  total_duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_video_views_video_id ON video_views(video_id);
CREATE INDEX idx_video_views_created_at ON video_views(created_at);
```

### 2. useVideoTracking フック

```typescript
// hooks/useVideoTracking.ts
export function useVideoTracking(videoId: string) {
  // - 再生開始時に video_views レコードを作成
  // - 定期的に watch_duration を更新（30秒間隔）
  // - 再生完了時に completed = true に更新
  // - Beacon API でページ離脱時にも送信
}
```

### 3. Beacon API 対応

- `navigator.sendBeacon` でページ離脱時に視聴データを送信
- フォールバック: `fetch` with `keepalive: true`

### 4. VideoPlayer 統合

- 既存の `VideoPlayer` コンポーネントに `useVideoTracking` を組み込み
- HLS.js イベント（`MEDIA_ATTACHED`, `FRAG_LOADED` 等）と連携

### 5. 管理画面での表示

- 動画詳細ページに視聴統計を表示（総再生回数・完了率・平均視聴時間）
- 日別/週別のグラフ表示

## 優先度

低（分析機能であり、コア機能には影響しない）

## 注意事項

- RLS: 匿名ユーザーの視聴も記録（viewer_id = null 許容）
- パフォーマンス: バッチ更新を検討（高トラフィック時）
- プライバシー: IP アドレスのハッシュ化を検討
