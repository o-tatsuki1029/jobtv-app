# 通知システム

## 1. 概要

本プロジェクトは以下の 5 つの通知チャネルを持つ。


| チャネル          | 技術                                            | 用途              |
| ------------- | --------------------------------------------- | --------------- |
| メール           | SendGrid REST API（直接呼び出し）                     | ユーザー向け認証・通知メール  |
| LINE          | LINE Messaging API Push（直接 HTTP）              | 学生向け通知・管理者配信    |
| Slack         | Incoming Webhook（直接 HTTP）                     | 運営向けアラート・通知     |
| Google Sheets | Sheets API v4（googleapis パッケージ）               | 登録・予約データの外部記録   |
| アプリ内通知        | DB 駆動（`notifications` + `notification_reads`） | Studio/管理画面上の通知 |


すべてのチャネルで外部ライブラリ（SDK）は最小限にとどめ、REST API を直接呼び出すパターンを採用している。

---

## 2. チャネル別詳細

### 2.1 メール（SendGrid）

- **送信方法**: SendGrid REST API v3 を `fetch` で直接呼び出し（npm パッケージ不使用）
- **テンプレート管理**: `email_templates` テーブル（DB 管理、管理画面 `/admin/email/templates` から CRUD）
- **ログ**: `email_logs` テーブル + 管理画面 `/admin/email/logs`

#### 送信トリガー一覧（14 種）


| テンプレート名                            | トリガー                  | 送信先     | 経路                 |
| ---------------------------------- | --------------------- | ------- | ------------------ |
| `signup_confirmation`              | 会員登録時                 | 学生      | Supabase Auth Hook |
| `password_reset`                   | パスワードリセット要求           | 学生      | Supabase Auth Hook |
| `candidate_welcome`                | 会員登録完了 / イベント予約時の自動登録 | 学生      | Server Action      |
| `invite_recruiter`                 | 採用担当の招待               | 採用担当    | Server Action      |
| `invite_team_member`               | チームメンバーの招待            | チームメンバー | Server Action      |
| `invite_student`                   | 学生の招待                 | 学生      | Server Action      |
| `job_application_notification`     | 求人エントリー               | 採用担当    | Server Action      |
| `job_application_confirmation`     | 求人エントリー               | 学生      | Server Action      |
| `session_reservation_notification` | 説明会予約                 | 採用担当    | Server Action      |
| `session_reservation_confirmation` | 説明会予約                 | 学生      | Server Action      |
| `event_reservation_confirmation`   | イベント予約                | 学生      | Server Action      |
| `event_reservation_reminder_7d`    | イベント 7 日前             | 学生      | Cron               |
| `event_reservation_reminder_3d`    | イベント 3 日前             | 学生      | Cron               |
| `event_reservation_reminder_1d`    | イベント 1 日前             | 学生      | Cron               |


#### 主要ファイル


| ファイル                                               | 役割                                    |
| -------------------------------------------------- | ------------------------------------- |
| `lib/email/sendgrid.ts`                            | SendGrid API ラッパー（`sendEmail`）        |
| `lib/email/send-templated-email.ts`                | テンプレート取得 → 変数展開 → 送信 → ログ記録のオーケストレーター |
| `lib/email/template-renderer.ts`                   | テンプレート変数（`{{name}}` 等）の展開             |
| `lib/email/send-entry-notification.ts`             | 求人エントリー / 説明会予約の通知送信                  |
| `lib/email/send-event-reservation-notification.ts` | イベント予約通知（メール + LINE + Slack + Sheets） |
| `lib/email/slack.ts`                               | Slack 送信（メール失敗通知 / 会員登録通知）            |
| `app/api/webhooks/email/route.ts`                  | Supabase Auth Hook（認証メール送信）           |
| `app/api/cron/event-reminder/route.ts`             | リマインダー Cron Job                       |


> パスはすべて `apps/jobtv/` からの相対パス。

---

### 2.2 LINE（Messaging API）

- **送信方法**: LINE Messaging API Push メッセージ（直接 HTTP、SDK 不使用）
- **メッセージ形式**: テキスト / Flex Message（カード・カルーセル） / 画像に対応。管理画面でビルダー UI から作成し、LINE ネイティブ UI でプレビュー可能
- **OAuth**: LINE Login で `candidates.line_user_id` を取得・紐付け

#### 送信トリガー一覧（5 種）


| トリガー       | 内容                  | 経路                           |
| ---------- | ------------------- | ---------------------------- |
| イベント予約確認   | 予約直後に Push 送信       | Server Action                |
| イベントリマインダー | 7 日前 / 3 日前 / 1 日前  | Cron                         |
| 管理者セグメント配信 | 卒年・業界・職種等でフィルタし一斉送信 | 管理画面 `/admin/line/broadcast` |
| 予約配信       | 指定日時に自動実行           | Cron（5 分間隔）                  |
| 配信リトライ     | 失敗配信を自動再送（最大 3 回）   | Cron（15 分間隔）                 |


#### 配信ログ・リトライ

- **配信ログ**: 配信ごとに `line_broadcast_logs` に 1 行、候補者別に `line_broadcast_deliveries` に 1 行ずつ記録。管理画面 `/admin/line/history` で一覧・詳細レポートを確認可能
- **リトライ**: `line_broadcast_deliveries` の `status='failed'` かつ `retry_count < 3` のレコードを Cron（15 分間隔）で自動リトライ。成功時は `status` を `success` に更新し、親ログのカウントを再集計
- **テスト送信**: 管理者が自分の LINE アカウント（`admin_line_user_ids`）宛にテスト送信可能。全配信前の確認用
- **テンプレート**: `line_message_templates` によく使うメッセージ構成を保存・再利用。配信画面からテンプレートを選択して送信

詳細は `docs/line-integration.md`（拡張機能セクション）および `docs/database-domain.md`（LINE 配信ログ・テンプレート）を参照。

#### CTA 動線（LINE 連携への誘導）

サンクスページ、ウェルカムメール、メールフッター、エントリーモーダル、マイページの 5 箇所に LINE 連携ボタンを配置。
詳細は `docs/line-integration.md` を参照。

#### 主要ファイル


| ファイル                                               | 役割                            |
| -------------------------------------------------- | ----------------------------- |
| `lib/line.ts`                                      | LINE Login OAuth ロジック         |
| `lib/actions/line-actions.ts`                      | LINE 連携の Server Actions       |
| `lib/actions/line-broadcast-actions.ts`            | 管理者セグメント配信・テスト送信・配信ログ・リトライ    |
| `lib/email/send-event-reservation-notification.ts` | イベント予約時の LINE Push 送信         |
| `app/api/line/authorize/route.ts`                  | OAuth 認可リクエスト                 |
| `app/api/line/callback/route.ts`                   | OAuth コールバック                  |
| `app/api/cron/line-broadcast/route.ts`             | 予約配信 Cron（5 分間隔）              |
| `app/api/cron/line-broadcast-retry/route.ts`       | 配信リトライ Cron（15 分間隔）           |
| `app/admin/line/history/page.tsx`                  | 配信履歴一覧                        |
| `app/admin/line/templates/page.tsx`                | テンプレート管理                      |


---

### 2.3 Slack（Incoming Webhook）

- **送信方法**: Slack Incoming Webhook（HTTP POST、ライブラリ不使用）
- **メッセージ形式**: Block Kit（リッチフォーマット）

#### 送信トリガー一覧（3 種）


| トリガー    | Webhook 環境変数                          | 送信元ファイル                                            |
| ------- | ------------------------------------- | -------------------------------------------------- |
| メール送信失敗 | `SLACK_EMAIL_WEBHOOK_URL`             | `lib/email/slack.ts`                               |
| 新規会員登録  | `SLACK_SIGNUP_WEBHOOK_URL`            | `lib/email/slack.ts`                               |
| イベント予約  | `SLACK_EVENT_RESERVATION_WEBHOOK_URL` | `lib/email/send-event-reservation-notification.ts` |


---

### 2.4 Google Sheets（API v4）

- **送信方法**: Google Sheets API v4（`googleapis` パッケージ、サービスアカウント認証）

#### 書き込みトリガー一覧（2 種）

**新規会員登録** → `GOOGLE_SHEETS_SPREADSHEET_ID` / `GOOGLE_SHEETS_SHEET_NAME`

- カラム A-Y: 登録日時、アカウント ID、卒年、専攻、性別、氏名、電話、メール、学校情報、希望業界/職種、UTM パラメータ
- 送信元: `lib/google/sheets.ts`

**イベント予約** → `GOOGLE_SHEETS_EVENT_RESERVATION_SPREADSHEET_ID` / `GOOGLE_SHEETS_EVENT_RESERVATION_SHEET_NAME`

- カラム A-T: 予約日時、氏名、メール、電話、学校、イベント情報、UTM パラメータ
- 送信元: `lib/email/send-event-reservation-notification.ts`

---

### 2.5 アプリ内通知

- **仕組み**: `notifications` + `notification_reads` テーブル（DB 駆動）
- **種類**: `success` / `info` / `warning` / `system`
- **対象**: 全体通知（`target_company_id = NULL`）または企業別
- **画面**: `/studio/notifications`（採用担当）、`/admin/notifications`（管理者）
- **主要ファイル**: `lib/actions/notification-actions.ts`

---

## 3. イベント × チャネル マトリクス


| イベント        | メール          | LINE | Slack | Sheets | アプリ内 |
| ----------- | ------------ | ---- | ----- | ------ | ---- |
| 会員登録        | ✅ 確認 + ウェルカム | -    | ✅     | ✅      | -    |
| パスワードリセット   | ✅            | -    | -     | -      | -    |
| 採用担当招待      | ✅ → 採用担当     | -    | -     | -      | -    |
| チームメンバー招待   | ✅ → メンバー     | -    | -     | -      | -    |
| 学生招待        | ✅ → 学生       | -    | -     | -      | -    |
| 求人エントリー     | ✅ → 採用担当 + 学生 | -    | -     | -      | -    |
| 説明会予約       | ✅ → 採用担当 + 学生 | -    | -     | -      | -    |
| イベント予約      | ✅ → 学生       | ✅    | ✅     | ✅      | -    |
| イベントリマインダー  | ✅ → 学生       | ✅    | -     | -      | -    |
| 管理者 LINE 配信 | -            | ✅    | -     | -      | -    |
| メール送信失敗     | -            | -    | ✅     | -      | -    |


---

## 4. 環境変数一覧

### SendGrid


| 変数名                   | 説明                                    | 必須  |
| --------------------- | ------------------------------------- | --- |
| `SENDGRID_API_KEY`    | API キー                                | ✅   |
| `SENDGRID_FROM_EMAIL` | 送信元メールアドレス（デフォルト: `noreply@jobtv.jp`） | -   |
| `SENDGRID_FROM_NAME`  | 送信元表示名（デフォルト: `JOBTV`）                | -   |


### LINE


| 変数名                         | 説明                         | 必須  |
| --------------------------- | -------------------------- | --- |
| `LINE_LOGIN_CHANNEL_ID`     | LINE Login チャネル ID         | ✅   |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Login チャネルシークレット      | ✅   |
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API チャネルアクセストークン | ✅   |


### Slack


| 変数名                                   | 説明                    | 必須  |
| ------------------------------------- | --------------------- | --- |
| `SLACK_EMAIL_WEBHOOK_URL`             | メール失敗通知用 Webhook URL  | -   |
| `SLACK_SIGNUP_WEBHOOK_URL`            | 会員登録通知用 Webhook URL   | -   |
| `SLACK_EVENT_RESERVATION_WEBHOOK_URL` | イベント予約通知用 Webhook URL | -   |


### Google Sheets


| 変数名                                              | 説明                           | 必須  |
| ------------------------------------------------ | ---------------------------- | --- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`                   | サービスアカウントメール                 | ✅   |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`             | サービスアカウント秘密鍵                 | ✅   |
| `GOOGLE_SHEETS_SPREADSHEET_ID`                   | 会員登録用スプレッドシート ID             | ✅   |
| `GOOGLE_SHEETS_SHEET_NAME`                       | 会員登録用シート名（デフォルト: `Sheet1`）   | -   |
| `GOOGLE_SHEETS_EVENT_RESERVATION_SPREADSHEET_ID` | イベント予約用スプレッドシート ID           | ✅   |
| `GOOGLE_SHEETS_EVENT_RESERVATION_SHEET_NAME`     | イベント予約用シート名（デフォルト: `Sheet1`） | -   |


---

## 5. データアクセス境界ルール（通知における主体と情報の流れ）

本システムには 3 つの主体があり、通知設計時は以下のルールを厳守する。

| 主体 | 役割 | 説明 |
|------|------|------|
| **admin** | 運営会社 | プラットフォーム全体を管理。イベントの企画・運営を行う |
| **recruiter** | クライアント企業 | 自社の求人・説明会を管理。**自社に関する情報のみ**閲覧・通知を受ける |
| **学生（candidate）** | 利用ユーザー | 求人エントリー・説明会予約・イベント予約を行う |

### recruiter に通知してよいもの / してはいけないもの

| 機能 | 運営主体 | recruiter への通知 | 理由 |
|------|---------|-------------------|------|
| **求人エントリー** | 企業 | **OK** — 自社求人へのエントリー通知 | 企業が主催する求人への応募であり、自社データ |
| **説明会予約** | 企業 | **OK** — 自社説明会の予約通知 | 企業が主催する説明会への予約であり、自社データ |
| **イベント予約** | admin | **NG** — 予約者情報を recruiter に通知してはいけない | イベントは admin が運営するもの。予約管理は admin の責務であり、recruiter に学生の予約情報を流してはいけない |

> **原則**: recruiter には自社が主催・管理する機能に関する通知のみ送信する。admin が運営する機能（イベント等）の情報を recruiter に流さない。

---

## 6. 共通パターン

- **fire-and-forget**: 通知送信はメインのトランザクション（エントリー登録、予約登録等）をブロックしない。`await` はするが、失敗してもメイン処理は成功扱い
- **環境変数未設定時はサイレントスキップ**: API キーや Webhook URL が未設定の場合、エラーにせず処理をスキップ（ローカル開発時に通知を送信しない）
- **エラーはログ出力のみ、リトライなし**（メール・Slack・Sheets）: 送信失敗時は `console.error` でログ出力するのみ。自動リトライ機構はない。LINE 配信のみ Cron リトライ（最大 3 回）に対応済み
- **メール・LINE にログテーブルあり**: メールは `email_logs`、LINE 配信は `line_broadcast_logs` + `line_broadcast_deliveries` に送信結果を記録。Slack・Sheets にはログテーブルがない

---

## 7. 抜け漏れ・改善提案

### 通知の抜け漏れ候補


| #   | 内容                                       | 影響                                                      |
| --- | ---------------------------------------- | ------------------------------------------------------- |
| 1   | ~~**求人エントリー / 説明会予約 → 学生への確認メールがない**~~（解決済み） | `job_application_confirmation` / `session_reservation_confirmation` テンプレートで学生に確認メールを送信 |
| 2   | **求人エントリー / 説明会予約 → Slack・Sheets 連携がない** | イベント予約にはあるが、求人エントリーにはない。データの一元管理が不完全（スコープ外として保留）        |
| 3   | **イベント予約 → 採用担当への通知がない**（仕様通り・対応不要）    | イベントは admin 運営のため recruiter への予約通知は行わない（データアクセス境界ルール参照） |
| 4   | ~~**管理者 LINE 配信の送信ログがない**~~（解決済み）         | `line_broadcast_logs` + `line_broadcast_deliveries` で配信ログ・候補者別結果を記録。管理画面 `/admin/line/history` で確認可能 |
| 5   | ~~**`candidate_welcome` メールに LINE CTA が挿入されない**~~（解決済み） | `recipientRole: "candidate"` を設定して LINE CTA を自動挿入        |


### 信頼性・運用面


| #   | 内容                      | 影響                                           |
| --- | ----------------------- | -------------------------------------------- |
| 6   | **リトライ機構がない**（LINE は解決済み） | LINE 配信は `line_broadcast_deliveries` + Cron リトライ（最大 3 回）で対応済み。メール・Slack 等は未対応 |
| 7   | **通知設定（オプトアウト）がない**     | 学生・採用担当ともにメール配信停止や LINE 通知の種類別制御ができない        |
| 8   | ~~**LINE 配信ログテーブルがない**~~（解決済み） | `line_broadcast_logs` + `line_broadcast_deliveries` で記録済み |
| 9   | **Sheets 書き込み失敗の検知がない** | Slack 通知も email_logs もないため、失敗がサイレント          |
| 10  | **LINE Webhook 未実装**    | Push のみで、ユーザーからのメッセージへの自動応答には対応していない         |


