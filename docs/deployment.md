# デプロイ・運用

## ブランチ戦略

### ブランチ構成

3 環境を Git ブランチで分離し、Vercel の Git 連携で自動デプロイする。

| ブランチ | 環境 | 用途 |
|---------|------|------|
| `main` | **PROD** | 本番デプロイ用。`staging` からの PR マージでのみ更新 |
| `staging` | **STG** | ステージングデプロイ用。`develop` からの PR マージで更新 |
| `develop` | **開発** | 開発統合ブランチ。feature ブランチの PR マージ先。**デフォルトブランチ** |

```
feature/* ──PR──▶ develop ──PR──▶ staging ──PR──▶ main
                  (統合)          (STG デプロイ)    (PROD デプロイ)
```

### Branch Protection Rules

| ブランチ | PR 必須 | 承認者数 | 直接 push 禁止 | Force push 禁止 |
|---------|--------|---------|--------------|----------------|
| `main` | Yes | 1+ | Yes | Yes |
| `staging` | Yes | — | Yes | Yes |
| `develop` | 任意（段階的に厳格化） | — | — | — |

### 開発者ワークフロー

#### 通常の機能開発

```bash
git checkout develop && git pull
git checkout -b feature/機能名
# 開発・コミット
git push -u origin feature/機能名
# GitHub で PR 作成: feature/機能名 → develop
# レビュー → マージ
```

#### STG へのプロモーション

```bash
# GitHub で PR 作成: develop → staging
# 変更内容をレビュー
# マージ → Vercel が自動で STG にデプロイ（Preview デプロイ）
```

#### PROD へのプロモーション

```bash
# GitHub で PR 作成: staging → main
# 最終レビュー・承認
# マージ → Vercel が自動で PROD にデプロイ（Production デプロイ）
```

#### ホットフィックス（緊急修正）

```bash
git checkout main && git pull
git checkout -b hotfix/修正内容
# 修正・コミット
# PR: hotfix/修正内容 → main → マージ → PROD デプロイ
# main を staging と develop にもマージ（逆流）
```

---

## 環境構成

### 環境の種類

| 環境 | ブランチ | デプロイ先 | 接続先リソース |
|------|---------|----------|-------------|
| ローカル | — | localhost | Supabase STG / AWS STG |
| 開発（develop） | `develop` | Vercel Preview | Supabase STG / AWS STG |
| STG | `staging` | Vercel Preview | Supabase STG / AWS STG |
| PROD | `main` | Vercel Production | 本番 Supabase / AWS PROD |

```
ローカル（localhost）  ┐
develop（Vercel Preview）├── 同じ Supabase STG / AWS STG を参照
staging（Vercel Preview）┘

main（Vercel Production）→ 本番 Supabase / AWS PROD
```

### ローカルとステージングの違い

| 項目 | ローカル | STG / develop（Vercel Preview） | PROD（Vercel Production） |
|------|---------|-------------------------------|--------------------------|
| Supabase URL / キー | STG と同じ | STG | 本番 |
| AWS S3 バケット | `jobtv-videos-stg` | `jobtv-videos-stg` | 本番用バケット |
| CloudFront URL | STG と同じ | STG | 本番用 |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://jobtv-app-jobtv.vercel.app` | 本番ドメイン |
| Basic 認証 | あり（開発用 user/pass） | あり | なし |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | あり（ローカル専用） | **設定しない** | **設定しない** |
| `SKIP_ZEROTRUST_CHECK=true` | あり（ローカル専用） | **設定しない** | **設定しない** |
| Cloudflare Zero Trust | スキップ | 有効 | 有効 |

> **重要**: ローカルで開発しながら書き込んだデータは STG DB にそのまま反映される。
> ローカル ↔ STG ↔ develop はデータを完全共有しているため、テストデータの書き込みや削除は STG にも影響する。

### 環境変数の管理

#### ローカル開発

```
.env.local                     # ルート共通（Supabase URL など最小限）
apps/jobtv/.env.local          # jobtv ローカル用（フル設定）
.env.test                      # E2E テスト用（gitignore 済み）
```

`.env.local` は Next.js の規約でローカル優先で読み込まれる。

#### Vercel 環境変数（STG / PROD）

環境変数はすべて **Vercel ダッシュボード** の Environment Variables で管理する。
`.env.staging` ファイルは不要（Vercel のスコープ機能で環境を分離）。

| Vercel スコープ | 対象ブランチ | 接続先リソース |
|----------------|------------|-------------|
| **Production** | `main` | 本番 Supabase / AWS PROD |
| **Preview** | `staging`, `develop`, `feature/*` | STG Supabase / AWS STG |

> STG と develop は同じ Supabase STG / AWS STG を共有する。
> 将来的に分けたい場合は Preview 変数にブランチフィルタを追加できる。

### 本番環境を作るときに変える必要がある項目

本番環境を作成する際は、以下をすべて本番用の値に差し替える。

| 項目 | 現在（STG） | 本番時 |
|------|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `tdewumilkltljbqryjpg.supabase.co` | 本番 Supabase プロジェクトの URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | STG 公開キー | 本番公開キー |
| `SUPABASE_SERVICE_ROLE_KEY` | STG サービスロールキー | 本番サービスロールキー |
| `SUPABASE_JWT_SECRET` | STG JWT シークレット | 本番 JWT シークレット |
| `SUPABASE_HOOK_SECRET` | STG 用の値 | 本番 Supabase Dashboard → Auth → Hooks で設定した値 |
| `AWS_S3_BUCKET` | `jobtv-videos-stg` | 本番用バケット名 |
| `AWS_CLOUDFRONT_URL` | `d3ulvrrnhlrak2.cloudfront.net` | `d11xeybks927fj.cloudfront.net`（本番用） |
| `NEXT_PUBLIC_SITE_URL` | `https://jobtv-app-jobtv.vercel.app` | 本番ドメイン |
| `NODE_TLS_REJECT_UNAUTHORIZED` | 0（ローカルのみ） | **設定しない** |
| `SKIP_ZEROTRUST_CHECK` | `true`（ローカルのみ） | **設定しない** |

---

## Vercel デプロイ設定

### デプロイの仕組み

Vercel は Git 連携で自動的にデプロイする：

- **Production Branch**（= `main`）への push → **Production デプロイ**
- **それ以外のブランチ**への push → **Preview デプロイ**

つまり `staging` や `develop` へのマージも Preview デプロイとして自動実行される。

### 対象プロジェクト

| Vercel プロジェクト | アプリ | Root Directory |
|---|---|---|
| `jobtv-app-jobtv` | jobtv | `apps/jobtv` |

> event-system / agent-manager は後日対応。

### Vercel プロジェクト設定

**Settings > Git:**
- Production Branch: `main`
- Automatic Deployments: 有効（デフォルト）

**Settings > General:**
- Framework Preset: Next.js
- Root Directory: `apps/jobtv`
- Build Command: デフォルト（`next build`）

**Settings > Git > Ignored Build Step（ビルド最適化、任意）:**
```
npx turbo-ignore jobtv
```
→ jobtv に変更がないときビルドをスキップし、ビルド時間を節約する。

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
