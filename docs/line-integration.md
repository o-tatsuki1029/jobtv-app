# LINE 連携・配信

学生（candidate）の LINE アカウント連携と、Admin からのセグメント配信の仕様・参照実装をまとめる。

---

## 概要

- **学生側**: LINE Login で「アカウント連携」し、`candidates.line_user_id` に LINE の userId を保存する。設定画面で連携・解除が可能。
- **Admin 側**: 卒年度・業界・職種などでセグメントを切り、LINE 連携済み（`line_user_id IS NOT NULL`）の候補者に Messaging API の Push Message で配信する。
- **LINE CTA 動線**: 高モチベーションなタイミング（会員登録完了・サンクスメール・エントリー/予約完了・メニュー）で LINE 連携 CTA を表示し、連携率を向上させる。

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

## LINE CTA 動線

LINE 連携を促すタッチポイントの一覧。すべて**候補者（candidate）のみ**を対象とする。

### 1. 会員登録完了画面

- **ファイル**: `app/auth/signup/page.tsx`（success ブロック）
- **表示条件**: 会員登録成功後に常に表示（連携済み/未連携の出し分けなし）
- **動作**: ボタンをクリックするとログインページ（`/auth/login?next=%2Fapi%2Fline%2Fauthorize`）に遷移し、ログイン後そのまま LINE OAuth が開始される

### 2. サンクスメール（candidate_welcome）

- **ファイル**: `supabase/migrations/20260307000002_update_candidate_welcome_email_line_cta.sql`
- **動作**: 既存の「JobTV を見てみる」ボタンの直下に LINE CTA ブロックを挿入。リンク先は `{site_url}/settings/line`
- 適用: `ON CONFLICT (name) DO UPDATE` でテンプレートを上書き更新

### 3. メール共通フッター

- **ファイル**: `lib/email/send-templated-email.ts`
- **動作**: `sendTemplatedEmail` に `recipientRole?: string` を追加。`recipientRole === "candidate"` の場合、HTML メール内の最初の `<hr>` タグ直前に LINE CTA ブロックを注入し、テキストメール末尾にも付加する
- 出し分けなし（LINE 連携済み/未連携を問わず挿入）

```ts
// 呼び出し例（候補者向けメールの場合）
await sendTemplatedEmail({
  templateName: "some_candidate_template",
  recipientEmail: candidateEmail,
  variables: { ... },
  recipientRole: "candidate",   // ← これを追加すると LINE CTA が挿入される
});
```

### 4. CandidateMenu（ハンバーガーメニュー）

- **ファイル**: `components/header/CandidateMenu.tsx`
- **動作**: メニュー項目に「LINE連携」→ `/settings/line` を追加（常時表示）

### 5. エントリー/予約完了モーダル

- **ファイル**: `components/company/CompanyEntryModal.tsx`
- **Props**: `lineLinked?: boolean`（`CompanyEntryModalPropsBase` に追加）
- **動作**:
  - `lineLinked === false`: 完了後に自動クローズせず「LINEと連携する（→ `/api/line/authorize`）」と「閉じる」ボタンを表示
  - `lineLinked !== false`（`true` または `undefined`）: 従来通り 1.5 秒後に自動クローズ
- **lineLinked の取得・伝搬**:
  - `app/(main)/session/[id]/page.tsx` と `app/(main)/company/[id]/page.tsx`（Server Component）で `getLineLinkStatus()` を呼ぶ
  - 結果を `SessionDetailView` / `CompanyProfileView`（Client Component）の props に渡し、それぞれが `CompanyEntryModal` に転送する
  - ゲスト・非候補者は `getLineLinkStatus()` が `{ data: null }` を返すため `lineLinked = undefined` → 自動クローズ（CTA 非表示）

| ファイル | 役割 |
|---------|------|
| `app/(main)/session/[id]/page.tsx` | `getLineLinkStatus()` を呼び `lineLinked` を `SessionDetailView` に渡す |
| `app/(main)/company/[id]/page.tsx` | `getLineLinkStatus()` を呼び `lineLinked` を `CompanyProfileView` に渡す |
| `components/SessionDetailView.tsx` | `lineLinked?: boolean` を受け取り `CompanyEntryModal` に転送 |
| `components/company/CompanyProfileView.tsx` | `lineLinked?: boolean` を受け取り `CompanyEntryModal` に転送 |
| `components/company/CompanyEntryModal.tsx` | `lineLinked` に基づき完了後動作を切り替え |

---

## DB・RLS

- `candidates.line_user_id`: LINE の userId（text, UNIQUE, NULL 許可）。既存 RLS「Candidates can update own row」により、候補者は自分の行の `line_user_id` のみ更新可能。Admin は既存ポリシーで全件参照可能。
- マイグレーション: `supabase/migrations/20260226000000_add_candidates_line_user_id.sql`。詳細は [database-domain.md](database-domain.md) の「求職者（candidates）と会員登録」を参照。
