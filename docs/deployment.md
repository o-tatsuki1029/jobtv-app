# デプロイ・運用

## デプロイ先

- **JobTV アプリ（jobtv）**: [Vercel](https://vercel.com) にデプロイする。

---

## JobTV アプリ全体の Basic 認証（オプション）

### 方針

- **ステージングなどでアプリ全体をガードしたい場合**に、環境変数で Basic 認証を有効にできる。
- 環境変数を設定したときだけ有効。未設定のときは Basic 認証はかからない。

### 設定方法

- **jobtv** の環境変数に以下を設定する：
  - `BASIC_AUTH_USER`: Basic 認証のユーザー名
  - `BASIC_AUTH_PASSWORD`: Basic 認証のパスワード
- 両方設定されている場合、静的ファイル（`/_next/`、`favicon.ico`、画像・CSS・JS 等）以外の**全ルート**で Basic 認証がかかる。
- 認証通過後、従来どおり Supabase のセッションやロールに応じたリダイレクトが行われる。

### 実装

- [apps/jobtv/proxy.ts](apps/jobtv/proxy.ts) で Basic 認証をチェックし、失敗時は 401 と `WWW-Authenticate: Basic` を返す。

---

## 管理者画面（/admin）のアクセス制限

### 方針

- **admin 配下へのアクセスには IP 制限をかける。**
- **IP 制限はアプリではなく、インフラ側（Vercel）で実施する。**

### 理由

- 許可されていない IP からのリクエストをアプリに届く前に遮断できる。
- 許可 IP の変更は Vercel の設定で行い、アプリのコード変更は不要にできる。

### 実施方法（Vercel）

Vercel の **Firewall** または **IP Allowlist** を用い、`/admin` および `/admin/*` へのアクセスを許可する IP のみに限定する。

- 設定場所: Vercel ダッシュボード → プロジェクト → Settings → Firewall（または該当するセキュリティ設定）
- 対象パス: `/admin`, `/admin/*`
- 許可 IP は運用で定めた一覧を設定する（オフィス・VPN 等）。

### 注意

- 本制限は **認証・MFA（requireAdmin）とは別レイヤー** である。IP 許可後にログインし、TOTP 検証が必要。
- 開発・ステージング環境で admin に触る場合は、Vercel の環境別設定で許可 IP を設定するか、該当環境のみ制限を緩和する。
