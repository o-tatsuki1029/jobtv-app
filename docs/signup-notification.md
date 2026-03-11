# 会員登録通知（Slack / Google Sheets）

学生が新規会員登録した際に、Slack への通知と Google Spreadsheet への転記を自動で行う機能。

## 関連ファイル

| ファイル | 役割 |
|---------|------|
| `apps/jobtv/lib/types/signup.ts` | `SignUpCandidatePayload` 型定義 |
| `apps/jobtv/lib/email/slack.ts` | `sendSignupSlackNotification()` |
| `apps/jobtv/lib/google/sheets.ts` | `appendCandidateToSheet()` |
| `apps/jobtv/lib/actions/auth-actions.ts` | `signUp()` 内で fire-and-forget 呼び出し |

## 動作概要

`signUp()` の RPC 成功後、以下を非同期（fire-and-forget）で実行する。
いずれかが失敗しても登録処理には影響しない。

```typescript
sendSignupSlackNotification(payload).catch(...);
appendCandidateToSheet(payload).catch(...);
```

## 必要な環境変数

| 変数名 | 説明 |
|--------|------|
| `SLACK_SIGNUP_WEBHOOK_URL` | Slack Incoming Webhook URL（専用チャンネル） |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account のメールアドレス |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service Account の秘密鍵（PEM形式、`\n` エスケープ） |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | スプレッドシートの ID（URL の末尾部分） |
| `GOOGLE_SHEETS_SHEET_NAME` | シート名（省略時: `Sheet1`） |

いずれかが未設定の場合は、その通知のみサイレントスキップする。

## Slack 通知フォーマット

Bot 名: `JOBTV新規会員登録通知` / アイコン: 🎉

```
■ 新規会員登録 — 2026/3/10 18:21:31

■学生情報
武藤 彩音 (ムトウ アヤネ)
Tel：08059046100
Mail：anekp47183@example.com
学生情報：2027卒 文系 女性
学校：成蹊大学 文学部 - 国際文化学科  (大学)
志望業界：IT・通信、コンサルティング、メーカー
志望職種：企画、開発・エンジニア、マーケティング
アカウントID：xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

■登録情報
utm_source：tiktok
utm_medium：social
utm_campaign：line_present
utm_content：daisy
utm_term：
utm_referrer：https://jobtv.jp/event/campaign/all/
```

## Google Sheets 転記列順

シート名は `GOOGLE_SHEETS_SHEET_NAME` で設定（デフォルト: `Sheet1`）。

| 列 | ヘッダー | 内容 |
|----|---------|------|
| A | 登録日時 | JST |
| B | アカウントID | Supabase Auth の user ID |
| C | 卒年度 | 数値 |
| D | 文理 | 文系 / 理系 / その他 |
| E | 性別 | |
| F | 姓 | |
| G | 名 | |
| H | セイ | |
| I | メイ | |
| J | 携帯電話番号 | テキスト強制（先頭0保持） |
| K | メールアドレス | |
| L | 都道府県 | 希望勤務地 |
| M | 生年月日 | |
| N | 学校種別 | |
| O | 学校名 | |
| P | 学部名 | |
| Q | 学科名 | |
| R | 志望業界 | 全角読点（、）区切り |
| S | 志望職種 | 全角読点（、）区切り |
| T | utm_source | |
| U | utm_medium | |
| V | utm_campaign | |
| W | utm_content | |
| X | utm_term | |
| Y | referrer | |

## Google Service Account の準備手順

1. Google Cloud Console でプロジェクトを開く
2. 「APIとサービス」→「ライブラリ」→「Google Sheets API」を有効化
3. 「認証情報」→「サービスアカウントを作成」（ロール設定不要）
4. 作成したアカウントのキーを JSON でダウンロード
5. JSON から `client_email` と `private_key` を環境変数に設定
6. スプレッドシートをサービスアカウントのメールアドレスに「編集者」権限で共有

## Slack Webhook の準備手順

1. [api.slack.com/apps](https://api.slack.com/apps) → 「Create New App」→「From scratch」
2. 「Incoming Webhooks」→ ON → 「Add New Webhook to Workspace」
3. 通知先チャンネルを選択 → URL を `SLACK_SIGNUP_WEBHOOK_URL` に設定

## テスト方法

Basic Auth がある環境では一時的に無効化してからテストする。

```bash
# UTM パラメータ付きでアクセス
http://localhost:3000/auth/signup?utm_source=tiktok&utm_medium=social&utm_campaign=test
```

1. 志望業界・職種を複数選択して登録
2. Slack に通知が届くことを確認
3. Sheets の最終行に転記されることを確認
4. 環境変数が未設定の場合、通知なしで正常登録できることを確認
