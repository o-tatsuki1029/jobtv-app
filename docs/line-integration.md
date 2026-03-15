# LINE 連携・配信

学生（candidate）の LINE アカウント連携と、Admin からのセグメント配信の仕様・参照実装をまとめる。

---

## 概要

- **学生側**: LINE Login で「アカウント連携」し、`candidates.line_user_id` に LINE の userId を保存する。設定画面で連携・解除が可能。
- **Admin 側**: 卒年度・業界・職種などでセグメントを切り、LINE 連携済み（`line_user_id IS NOT NULL`）の候補者に Messaging API の Push Message で配信する。
- **LINE CTA 動線**: 高モチベーションなタイミング（会員登録完了・サンクスメール・エントリー/予約完了・メニュー）で LINE 連携 CTA を表示し、連携率を向上させる。

---

## LINE Login（連携フロー）

1. 学生がログインした状態でマイページ（`/mypage`）の「LINEと連携する」ボタンをクリック。
2. ブラウザが `/api/line/authorize` に遷移。API は candidate であることを確認し、CSRF 用の `state` をランダム生成して Cookie（`line_link_state`）に保存し、LINE の認証 URL へ 302 リダイレクトする。
3. ユーザーが LINE で認証し、コールバック URL（`/api/line/callback`）に `code` と `state` が付与されて戻る。
4. コールバックで `state` を Cookie と照合（CSRF 検証）。`code` を LINE の token エンドポイントで access_token に交換し、プロフィール API で `userId` を取得する。
5. ログイン中の `profiles.candidate_id` に紐づく `candidates` 行の `line_user_id` を取得した `userId` で UPDATE。同一 userId が他候補者に既に紐づいていれば UNIQUE 制約で失敗し、エラー表示する。
6. 成功時は `/mypage?linked=1` にリダイレクト。

### 参照実装

| 役割 | パス（jobtv） |
|------|----------------|
| 連携開始（state 発行・LINE へリダイレクト） | `app/api/line/authorize/route.ts` |
| コールバック（code 交換・userId 取得・DB 更新） | `app/api/line/callback/route.ts` |
| code → token → userId 取得 | `lib/line.ts`（exchangeCodeForLineUserId, getLineCallbackRedirectUri） |
| 連携状態取得・解除 | `lib/actions/line-actions.ts`（getLineLinkStatus, unlinkLineAccount） |
| マイページ（連携状態表示・CTA・解除） | `app/(main)/mypage/page.tsx`, `components/mypage/MypageTopView.tsx` |

---

## Messaging API（配信）

- Admin が `/admin/line/broadcast` でセグメント条件を指定し、対象件数を確認したうえでメッセージを作成して送信する。
- 配信対象は「条件に合致し、かつ `line_user_id IS NOT NULL`」の候補者のみ。
- LINE Messaging API の **Push Message**（`POST https://api.line.me/v2/bot/message/push`）で 1 件ずつ送信。レート制限を考慮し、送信間隔（50ms）を空けている。
- 配信ごとに `line_broadcast_logs` に履歴を記録し、候補者ごとの送信結果を `line_broadcast_deliveries` に保存する。
- 一時エラー（5xx/429）は即時 1 回リトライし、それでも失敗した分は Cron（15 分間隔）で最大 3 回まで自動リトライする。恒久エラー（400/401/403）は `blocked` としてリトライしない。
- 予約配信: 日時指定で `status='scheduled'` として保存し、Cron（5 分間隔）が到達時刻に自動実行する。

---

### 配信画面の構成（`/admin/line/broadcast`）

```
┌────────────────────────────────────────┐  ┌──────────────┐
│ セグメント条件                           │  │ LINE Chat    │
│  卒年度 / 学校種別 / 文理                 │  │ Frame        │
│  興味のある業界 / 職種（複数選択可）         │  │ （プレビュー） │
├────────────────────────────────────────┤  │              │
│ 配信対象: N 人                           │  │  テキスト:     │
├────────────────────────────────────────┤  │  右寄せ緑泡    │
│ メッセージ作成                            │  │              │
│  [テンプレートから読み込み ▼]               │  │  Flex/画像:   │
│  [テキスト][カード][カルーセル][画像][Imagemap]│  │  左寄せ+      │
│  ┌──────────────────────────────────┐  │  │  アバター     │
│  │ (選択タイプに応じたビルダーフォーム)    │  │  │              │
│  │ [ビルダー / JSON 切替]               │  │  └──────────────┘
│  └──────────────────────────────────┘  │    右下固定 320px
│  [テンプレートとして保存]                   │    (md 未満:
│  [予約日時: ________]                     │     フローティング
│  [テスト送信] [配信する / 予約する]          │     プレビューボタン)
└────────────────────────────────────────┘
```

- 左カラム: セグメント条件 → 対象件数 → メッセージ作成（タイプ選択 + ビルダー or JSON 編集）→ テンプレート保存 → 予約日時 → 送信/予約/テスト送信ボタン
- 右下固定: `LineChatFrame` による LINE トーク画面風プレビュー（`md:` 以上で表示）
- モバイル: フローティングボタンで `MobilePreviewDrawer` を開閉
- タイプ切替時にフォーム状態は各タイプごとに独立保持される（テキスト入力済み→カードに切替→テキストに戻すと入力が残る）
- テンプレートドロップダウンで既存テンプレートを読み込み、ビルダー状態を復元
- 日時ピッカーに値を入れると「配信する」ボタンが「予約する」に変化

### メッセージタイプ

| タイプ | ビルダー | LINE API 型 | 説明 |
|--------|---------|-------------|------|
| テキスト | `TextMessageBuilder` | `text` | プレーンテキスト。5000 文字まで。変数挿入対応 |
| カード（Bubble） | `BubbleBuilder` + `BubbleFormFields` | `flex`（Bubble） | ヒーロー画像 + タイトル + 説明文 + ボタン（1〜3個）。代替テキスト必須 |
| カルーセル | `CarouselBuilder` + `BubbleFormFields` | `flex`（Carousel） | 複数カード（1〜12枚）の横スクロール。追加/削除/並び替え対応。代替テキスト必須 |
| 画像 | `ImageMessageBuilder` | `image` | 画像のみ。JPEG/PNG、10MB 以下。`originalContentUrl` と `previewImageUrl` に同一 URL を使用 |
| Imagemap | `ImagemapBuilder` | `imagemap` | 画像にクリッカブルエリアを定義。幅 1040px 基準の座標系。URI or メッセージアクション |

### 変数埋め込み（パーソナライズ配信）

テキストおよび Flex Message のタイトル・説明文で `{{変数名}}` を使用できる。送信時に候補者ごとの実データに置換される。

| 変数 | 説明 | サンプル値（プレビュー用） |
|------|------|--------------------------|
| `{{last_name}}` | 姓 | 山田 |
| `{{first_name}}` | 名 | 太郎 |
| `{{full_name}}` | 氏名（姓 + 名を結合） | 山田太郎 |
| `{{graduation_year}}` | 卒年度 | 2027 |
| `{{school_name}}` | 学校名 | 東京大学 |

**データ取得の注意**: 名前（`last_name`, `first_name`）は `candidates` テーブルではなく `profiles` テーブルに格納されている。`sendLineBroadcast` では `profiles!profiles_candidate_id_fkey(last_name, first_name)` で JOIN して取得する。`full_name` は `last_name` + `first_name` を結合して生成（DB カラムには存在しない）。

**実装ファイル**:
- 変数定義・置換関数: `lib/line-message-variables.ts`
- UI（変数挿入ドロップダウン）: `components/admin/line-flex/builders/VariableInserter.tsx`
- サーバー側置換: `lib/actions/line-broadcast-actions.ts`（`buildVariableMap` + `replaceMessageVariables`）

### Flex Message プレビュー（LINE ネイティブ UI レンダラー）

LINE 公式の Flex Message Simulator に準拠した HTML/CSS レンダリング。`LineChatFrame` がトーク画面風のフレーム、内部で `FlexRenderer` がメッセージ種別に応じた描画を行う。

**デザイントークン**（`line-flex-constants.ts`）:

| トークン | 値 |
|---------|-----|
| テキストサイズ | xxs=10px, xs=12px, sm=13px, md=14px（デフォルト）, lg=16px, xl=18px, xxl=20px, 3xl=24px, 4xl=28px, 5xl=32px |
| スペーシング | none=0, xs=2px, sm=4px, md=8px, lg=12px, xl=16px, xxl=20px |
| LINE グリーン | `#06C755` |
| チャット背景 | `#7494AA` |
| テキストバブル（送信者側） | `#D4F4DD` |
| バブル最大幅 | 300px |
| バブル角丸 | 16px |

**レンダラーコンポーネント群**（`components/admin/line-flex/`）:

| コンポーネント | 役割 |
|--------------|------|
| `FlexRenderer` | `LineMessage` を受け取り、type に応じて各レンダラーに振り分け。プレビュー時は変数をサンプル値に置換 |
| `FlexBubble` | バブル（カード）。hero/header/body/footer セクション。セクションにデフォルト padding 20px を付与 |
| `FlexCarousel` | カルーセル。横スクロール + snap + オーバーレイ矢印ナビ |
| `FlexBox` | 再帰的ボックスレイアウト。horizontal layout で子の flex 未指定時に flex:1 を自動付与 |
| `FlexText` | テキスト。wrap / maxLines / align / gravity / style / decoration 対応 |
| `FlexImage` | 画像。padding-bottom hack で aspectRatio を再現 |
| `FlexButton` | ボタン。primary（塗り）/ secondary（枠線）/ link（テキスト） |
| `FlexIcon` | アイコン画像 |
| `FlexSeparator` | 区切り線 |
| `FlexSpacer` | スペーサー |
| `LineChatFrame` | LINE トーク画面風フレーム（ヘッダーバー + チャット背景 + 入力バー装飾） |

### フォーム状態 → Flex JSON 変換

`lib/line-flex-builder.ts` の純粋関数群。`BubbleBuilderState`（UI フォームの状態）を LINE Messaging API に送信可能な JSON に変換する。

| 関数 | 入力 | 出力 |
|------|------|------|
| `buildBubbleFromState(state)` | `BubbleBuilderState` | `LineFlexBubble` |
| `buildFlexMessage(bubble, altText)` | `LineFlexBubble` + `string` | `LineFlexMessage` |
| `buildCarouselMessage(bubbles, altText)` | `LineFlexBubble[]` + `string` | `LineFlexMessage` |
| `buildImageMessage(url)` | `string` | `LineImageMessage` |
| `buildImagemapMessage(baseUrl, altText, actions, baseSize?)` | `string` + `string` + `LineImagemapAction[]` | `LineImagemapMessage` |
| `validateFlexMessageJson(json)` | `string` | `{ valid, message } \| { valid, error }` |

### 画像アップロード

配信用画像は `uploadLineBroadcastImage` Server Action で Supabase Storage にアップロードする。

- バケット: `company-assets`
- パス: `admin/line-broadcast/{uuid}/{timestamp}.{ext}`
- 制約: JPEG/PNG のみ、10MB 以下（LINE API の制限）
- 返り値: 公開 URL
- UI: `StudioImageUpload` の `customUploadFunction` props で接続

### 参照実装

| 役割 | パス（jobtv） |
|------|----------------|
| 配信画面（セグメント UI・メッセージビルダー・送信・予約・テスト送信） | `app/admin/line/broadcast/page.tsx` |
| 件数取得・配信実行・予約・テスト送信・画像アップロード | `lib/actions/line-broadcast-actions.ts` |
| 配信ログ・レポート・CSV エクスポート・リトライ | `lib/actions/line-broadcast-log-actions.ts` |
| テンプレート CRUD | `lib/actions/line-template-actions.ts` |
| リッチメニュー API 操作 | `lib/actions/line-richmenu-actions.ts` |
| 配信履歴一覧 | `app/admin/line/history/page.tsx` |
| 配信詳細・レポート | `app/admin/line/history/[id]/page.tsx` |
| テンプレート一覧 | `app/admin/line/templates/page.tsx` |
| リッチメニュー管理 | `app/admin/line/richmenu/page.tsx` |
| 予約配信 Cron（5 分間隔） | `app/api/cron/line-broadcast/route.ts` |
| リトライ Cron（15 分間隔） | `app/api/cron/line-broadcast-retry/route.ts` |
| Flex Message 型定義（API 準拠 + ビルダー状態 + Imagemap） | `types/line-flex.types.ts` |
| 配信ログ・配信結果型定義 | `types/line-broadcast.types.ts` |
| リッチメニュー型定義 | `types/line-richmenu.types.ts` |
| フォーム状態 → Flex JSON 変換・JSON バリデーション | `lib/line-flex-builder.ts` |
| 変数定義・置換関数 | `lib/line-message-variables.ts` |
| LINE チャットフレーム（プレビュー） | `components/admin/line-flex/LineChatFrame.tsx` |
| モバイルプレビュードロワー | `components/admin/line-flex/MobilePreviewDrawer.tsx` |
| Flex レンダラー群 | `components/admin/line-flex/Flex*.tsx` |
| Imagemap プレビュー | `components/admin/line-flex/FlexImagemap.tsx` |
| メッセージビルダー群（テキスト・カード・カルーセル・画像・Imagemap） | `components/admin/line-flex/builders/*.tsx` |
| JSON 直接編集 | `components/admin/line-flex/builders/JsonEditor.tsx` |
| 変数挿入 UI | `components/admin/line-flex/builders/VariableInserter.tsx` |
| デザイントークン・ユーティリティ | `components/admin/line-flex/line-flex-constants.ts` |
| LINE ナビゲーション定義 | `components/studio/constants.ts`（`ADMIN_LINE_NAVIGATION`） |
| Vercel Cron 設定 | `vercel.json` |

---

### 拡張機能

#### F1: テスト送信

管理者自身の LINE アカウントにメッセージをテスト送信する機能。配信前の内容確認に使用する。`admin_line_user_ids` テーブルに管理者の LINE userId を登録し、配信画面から「テスト送信」で自分宛に送信する。

- 主要ファイル: `lib/actions/line-broadcast-actions.ts`（テスト送信ロジック）、`app/admin/line/broadcast/page.tsx`（UI）

#### F2: 配信履歴・ログ

配信の実行記録を `line_broadcast_logs` に、候補者別の送信結果を `line_broadcast_deliveries` に保存する。管理画面 `/admin/line/history` で一覧・詳細を確認できる。

- 主要ファイル: `app/admin/line/history/page.tsx`、`lib/actions/line-broadcast-actions.ts`
- DB: `line_broadcast_logs`、`line_broadcast_deliveries`（詳細は `docs/database-domain.md`）

#### F3: 配信予約（スケジュール配信）

日時を指定して配信を予約する。`line_broadcast_logs` に `status='scheduled'` + `scheduled_at` で保存し、Vercel Cron（5 分間隔）が到達時刻の配信を実行する。

- Cron: `/api/cron/line-broadcast`（`*/5 * * * *`）。詳細は `docs/scheduled-jobs.md` を参照
- 主要ファイル: `app/api/cron/line-broadcast/route.ts`、`lib/actions/line-broadcast-actions.ts`

#### F4: 送信リトライ

失敗した配信（`line_broadcast_deliveries.status='failed'` かつ `retry_count < 3`）を Vercel Cron（15 分間隔）で自動リトライする。最大 3 回まで。

- Cron: `/api/cron/line-broadcast-retry`（`5,20,35,50 * * * *`）。詳細は `docs/scheduled-jobs.md` を参照
- 主要ファイル: `app/api/cron/line-broadcast-retry/route.ts`、`lib/actions/line-broadcast-actions.ts`

#### F5: 配信レポート

配信ログの詳細画面で、対象数・成功数・失敗数・ブロック数をサマリー表示し、候補者ごとの送信結果（成功/失敗/ブロック・エラー詳細・リトライ回数）を一覧で確認できる。

- 主要ファイル: `app/admin/line/history/[id]/page.tsx`

#### F6: Imagemap メッセージ

画像の特定エリアにリンクを設定できる Imagemap メッセージ。ビルダー UI でエリアを指定し、LINE API の `imagemap` 型で送信する。

- 主要ファイル: `components/admin/line-flex/builders/ImagemapBuilder.tsx`、`lib/line-flex-builder.ts`

#### F7: リッチメニュー管理

LINE 公式アカウントのリッチメニュー（トーク画面下部のメニュー）を管理画面から設定・更新する。LINE Messaging API の Rich Menu エンドポイントを使用。

- 主要ファイル: `app/admin/line/richmenu/page.tsx`、`lib/actions/line-richmenu-actions.ts`

#### F8: テンプレート管理

よく使うメッセージ構成（Flex JSON + ビルダー UI 状態）を `line_message_templates` に保存し、配信時に再利用する。テンプレート一覧・作成・編集・削除を管理画面で行う。

- 主要ファイル: `app/admin/line/templates/page.tsx`、`lib/actions/line-template-actions.ts`
- DB: `line_message_templates`（詳細は `docs/database-domain.md`）

#### F10: JSON 直接編集

上級者向けに、ビルダー UI を使わず Flex Message の JSON を直接入力・編集できるモード。JSON バリデーション付き。

- 主要ファイル: `components/admin/line-flex/builders/JsonEditor.tsx`

#### F11: DnD カード並び替え

カルーセルのカード順序を `@dnd-kit` によるドラッグ&ドロップで並び替える。従来の矢印ボタンに加えてドラッグ操作に対応。

- 主要ファイル: `components/admin/line-flex/builders/CarouselBuilder.tsx`

#### F12: モバイルプレビュー

`md:` 未満のモバイル画面でも LINE メッセージプレビューを確認できるドロワー/モーダル表示。デスクトップでは従来通り右下固定表示。

- 主要ファイル: `components/admin/line-flex/MobilePreviewDrawer.tsx`、`app/admin/line/broadcast/page.tsx`

### 今後の実装 TODO

- [ ] **プレビューの視覚確認・調整**: LINE 公式 Flex Message Simulator との目視比較。現状 Playwright での自動検証が CAPTCHA + MFA で困難なため、ブラウザで手動確認が必要
- [ ] **送信テスト**: LINE 連携済みテストアカウントへ各タイプ（テキスト/カード/カルーセル/画像/Imagemap）のメッセージを実送信し、実機 LINE アプリでの表示を確認
- [ ] **A/B テスト配信**: セグメントをランダム分割し、異なるメッセージを送信して効果を比較

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
- **動作**: 既存の「JOBTV を見てみる」ボタンの直下に LINE CTA ブロックを挿入。リンク先は `{site_url}/api/line/authorize`
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

- ~~削除済み~~: メニュー項目「LINE連携」はマイページに集約済みのため削除

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
