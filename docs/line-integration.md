# LINE 連携・配信

学生（candidate）の LINE アカウント連携と、Admin からのセグメント配信の仕様・参照実装をまとめる。

---

## 概要

- **学生側**: LINE Login で「アカウント連携」し、`candidates.line_user_id` に LINE の userId を保存する。設定画面で連携・解除が可能。
- **Admin 側**: 卒年度・業界・職種などでセグメントを切り、LINE 連携済み（`line_user_id IS NOT NULL`）の候補者に Messaging API の Push Message で配信する。

---

## LINE Login（連携フロー）

1. 学生がログインした状態で `/settings/line` を開き「LINEと連携する」をクリック。
2. ブラウザが `/api/line/authorize` に遷移。API は candidate であることを確認し、CSRF 用の `state` をランダム生成して Cookie（`line_link_state`）に保存し、LINE の認証 URL へ 302 リダイレクトする。
3. ユーザーが LINE で認証し、コールバック URL（`/api/line/callback`）に `code` と `state` が付与されて戻る。
4. コールバックで `state` を Cookie と照合（CSRF 検証）。`code` を LINE の token エンドポイントで access_token に交換し、プロフィール API で `userId` を取得する。
5. ログイン中の `profiles.candidate_id` に紐づく `candidates` 行の `line_user_id` を取得した `userId` で UPDATE。同一 userId が他候補者に既に紐づいていれば UNIQUE 制約で失敗し、エラー表示する。
6. 成功時は `/settings/line?linked=1` にリダイレクト。

### 参照実装

| 役割 | パス（jobtv） |
|------|----------------|
| 連携開始（state 発行・LINE へリダイレクト） | `app/api/line/authorize/route.ts` |
| コールバック（code 交換・userId 取得・DB 更新） | `app/api/line/callback/route.ts` |
| code → token → userId 取得 | `lib/line.ts`（exchangeCodeForLineUserId, getLineCallbackRedirectUri） |
| 連携状態取得・解除 | `lib/actions/line-actions.ts`（getLineLinkStatus, unlinkLineAccount） |
| 学生向け設定ページ | `app/(main)/settings/line/page.tsx` |

---

## Messaging API（配信）

- Admin が `/admin/line`（配信は `/admin/line/broadcast`）でセグメント条件（卒年度・業界・職種・学校種別・文理など）を指定し、対象件数を確認したうえで配信文を入力して送信する。
- 配信対象は「条件に合致し、かつ `line_user_id IS NOT NULL`」の候補者のみ。
- LINE Messaging API の **Push Message**（`POST https://api.line.me/v2/bot/message/push`）で 1 件ずつ送信。レート制限を考慮し、送信間隔（例: 50ms）を空けている。
- 失敗時はログに記録し、成功・失敗件数を返す。リトライは現状未実装（必要に応じて line-broadcast-actions やキューで対応）。

### 参照実装

| 役割 | パス（jobtv） |
|------|----------------|
| 件数取得・配信実行 | `lib/actions/line-broadcast-actions.ts`（getLineBroadcastEligibleCount, sendLineBroadcast） |
| 配信画面（セグメント UI・送信） | `app/admin/line/broadcast/page.tsx` |

---

## 環境変数（jobtv）

| 変数名 | 用途 | 備考 |
|--------|------|------|
| `LINE_LOGIN_CHANNEL_ID` | LINE Login（連携）用チャネル ID | サーバー専用 |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login 用チャネルシークレット | サーバー専用 |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API 用チャネルアクセストークン（配信） | サーバー専用 |
| `NEXT_PUBLIC_SITE_URL` | コールバックのベース URL（例: `https://example.com`） | 未設定時は Vercel の URL や localhost を使用 |

---

## LINE Developers での準備

1. [LINE Developers Console](https://developers.line.biz/console/) でプロバイダー・チャネルを作成する。
2. **LINE Login** 用チャネル: 連携開始・コールバックで使用。Callback URL に `https://your-domain.com/api/line/callback` を登録。
3. **Messaging API** 用チャネル（公式アカウント）: 配信用。Channel Access Token（長期）を発行し、`LINE_CHANNEL_ACCESS_TOKEN` に設定する。
4. 同一 LINE 公式アカウントで「ログイン連携」と「友だちに配信」の両方を使う場合は、プロバイダーで LINE Login チャネルと Messaging API チャネルをリンクする（LINE の公式ドキュメント「アカウント連携」を参照）。

---

## DB・RLS

- `candidates.line_user_id`: LINE の userId（text, UNIQUE, NULL 許可）。既存 RLS「Candidates can update own row」により、候補者は自分の行の `line_user_id` のみ更新可能。Admin は既存ポリシーで全件参照可能。
- マイグレーション: `supabase/migrations/20260226000000_add_candidates_line_user_id.sql`。詳細は [database-domain.md](database-domain.md) の「求職者（candidates）と会員登録」を参照。
