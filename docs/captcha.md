# CAPTCHA（Cloudflare Turnstile）

## 概要

公開フォーム（ログイン・サインアップ・パスワードリセット・イベント予約）に Cloudflare Turnstile を導入し、bot による不正アクセス・大量登録・メール列挙を防止する。

**Turnstile 選定理由:**
- 無料（Enterprise 不要）
- Invisible / Managed モード（ユーザーに画像パズルを解かせない）
- GDPR フレンドリー（Cookie 不使用）
- Supabase Auth ネイティブ統合あり

---

## 環境変数

| 変数名 | 配置先 | 用途 |
|--------|--------|------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `.env.local` / `.env.staging` / `.env.production` | クライアント側ウィジェット描画 |
| `TURNSTILE_SECRET_KEY` | `.env.local` / `.env.staging` / `.env.production` | サーバー側手動検証（`createReservationForExistingCandidate` 用） |

**注:** Supabase native 検証で使う Secret Key は **Supabase ダッシュボード** 側に設定する（アプリの環境変数とは別）。

### ローカル開発用テストキー

Cloudflare 公式のテストキーを使用する。**常に成功する**。

- Site Key: `1x00000000000000000000AA`
- Secret Key: `1x0000000000000000000000000000000AA`

### Supabase ローカル（config.toml）

`supabase/config.toml` の `[auth.captcha]` セクションで有効化済み。Secret はローカル用テストキー。

### 本番・STG

1. **Supabase ダッシュボード** > Authentication > Bot and Abuse Protection で Turnstile を有効化し、Secret Key を設定
2. **Vercel** の環境変数に `NEXT_PUBLIC_TURNSTILE_SITE_KEY` と `TURNSTILE_SECRET_KEY` を追加
3. **Cloudflare Turnstile ダッシュボード** でドメインを許可リストに追加

---

## 検証パターン

### 1. Supabase native（6 箇所）

Supabase Auth のメソッド（`signInWithPassword` / `signUp` / `resetPasswordForEmail`）の `options.captchaToken` にトークンを渡す。Supabase が自動で Cloudflare API に検証リクエストを送る。

**対象:**
- 学生ログイン（`/auth/login`）
- 企業ログイン（`/studio/login`）
- 管理者ログイン（`/admin/login`）
- 学生サインアップ（`/auth/signup`）
- パスワードリセット（`/auth/forgot-password`）
- イベント予約・新規会員登録経路（`signUpAndReserveEvent`）

### 2. 手動サーバー検証（1 箇所）

Supabase Auth を経由しない処理は、サーバー側で Turnstile `/siteverify` API を呼んで検証する。

**対象:**
- イベント予約・既存候補者経路（`createReservationForExistingCandidate`）

**検証ユーティリティ:** `apps/jobtv/lib/captcha/verify-turnstile.ts`

---

## TurnstileWidget コンポーネント

`apps/jobtv/components/common/TurnstileWidget.tsx`

### Props

| Prop | 型 | デフォルト | 説明 |
|------|----|-----------|------|
| `onToken` | `(token: string) => void` | - | トークン取得時のコールバック（プログラム的取得用） |
| `theme` | `"light" \| "dark"` | `"light"` | ウィジェットテーマ |
| `action` | `string` | - | 分析用ラベル |

### 使い方

```tsx
// form 内に配置するだけ（hidden input が自動生成される）
<form action={serverAction}>
  {/* ...フォームフィールド... */}
  <TurnstileWidget theme="light" action="login" />
  <button type="submit">送信</button>
</form>
```

Server Action 側では `formData.get("captchaToken")` でトークンを取得する。

プログラム的にトークンを取得する場合は `onToken` コールバックを使用する:

```tsx
const [token, setToken] = useState("");
<TurnstileWidget onToken={setToken} />
```

---

## 対象フォーム一覧

| フォーム | ファイル | テーマ | 検証方式 |
|---------|---------|-------|---------|
| 学生ログイン | `app/auth/login/page.tsx` | light | Supabase native |
| 企業ログイン | `app/studio/login/page.tsx` | dark | Supabase native |
| 管理者ログイン | `app/admin/(auth)/login/page.tsx` | dark | Supabase native |
| 学生サインアップ | `app/auth/signup/page.tsx` | light | Supabase native |
| パスワードリセット | `app/auth/forgot-password/page.tsx` | light | Supabase native |
| イベント予約（新規） | `app/(event)/event/entry/_components/EventEntryForm.tsx` | light | Supabase native |
| イベント予約（既存・未ログイン） | 同上 | light | 手動サーバー検証 |

**注:** ログイン済み候補者のイベント予約は認証済みのため Turnstile 不要。

---

## トラブルシューティング

### ウィジェットが表示されない

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` が設定されているか確認
- ブラウザのコンソールで Turnstile スクリプトのロードエラーを確認
- Content Security Policy が `challenges.cloudflare.com` をブロックしていないか確認

### "captcha verification process failed" エラー

- Supabase ダッシュボードで Turnstile の Secret Key が正しく設定されているか確認
- ローカルではテストキーを使用しているか確認

### トークン期限切れ

TurnstileWidget は `expired-callback` でトークンをクリアし、自動的にウィジェットをリセットする。ユーザーは再度ウィジェットが表示され、新しいトークンが自動取得される。
