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
# マージ → Vercel が自動で STG にデプロイ（カスタム環境 staging）
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

| 環境 | ブランチ | デプロイ先 | Supabase | AWS |
|------|---------|----------|----------|-----|
| ローカル | — | localhost | STG (`tdewumilkltljbqryjpg`) | STG |
| 開発（develop） | `develop` | Vercel Preview | STG (`tdewumilkltljbqryjpg`) | STG |
| STG | `staging` | Vercel カスタム環境 (staging) | STG (`tdewumilkltljbqryjpg`) | STG |
| PROD | `main` | Vercel Production | PROD (`voisychklptvavokrxox`) | PROD |

```
ローカル（localhost）          ┐
develop（Vercel Preview）      ├── Supabase STG (tdewumilkltljbqryjpg) / AWS STG
staging（Vercel カスタム環境 staging）┘

main（Vercel Production）→ Supabase PROD (voisychklptvavokrxox) / AWS PROD
```

**本番ドメイン**: `https://media.jobtv.jp`

### ローカルとステージングの違い

| 項目 | ローカル | STG（カスタム環境 staging）/ develop（Vercel Preview） | PROD（Vercel Production） |
|------|---------|-------------------------------|--------------------------|
| Supabase プロジェクト | STG (`tdewumilkltljbqryjpg`) | STG (`tdewumilkltljbqryjpg`) | PROD (`voisychklptvavokrxox`) |
| AWS S3 バケット | `jobtv-videos-stg` | `jobtv-videos-stg` | 本番用バケット |
| CloudFront URL | STG と同じ | STG | 本番用 |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://jobtv-app-jobtv.vercel.app` | `https://media.jobtv.jp` |
| Basic 認証 | あり（開発用 user/pass） | あり | `BASIC_AUTH_SCOPE` で制御 |
| `BASIC_AUTH_SCOPE` | 未設定（= `all`） | 未設定（= `all`） | リリース前: `all` / リリース後: `admin` |
| `SKIP_ZEROTRUST_CHECK=true` | あり（ローカル専用） | **設定しない** | **設定しない** |
| Cloudflare Zero Trust | スキップ（下記注意参照） | 有効 | 有効 |

> **Cloudflare Zero Trust について**: Zero Trust はネットワークレベルのアクセス制御（社外からの接続制限）であり、JOBTV 固有のセキュリティ対策ではない。ローカル開発時に `SKIP_ZEROTRUST_CHECK=true` を設定してスキップするのは、Zero Trust 環境下では外部サービス（Supabase 等）への TLS 通信が証明書エラーで失敗するため。`NODE_TLS_REJECT_UNAUTHORIZED=0` を自動適用して回避している。STG/PROD では Zero Trust が有効だが、これはインフラ側の制約であり、アプリケーションのセキュリティ機能には含めない。

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
| **カスタム環境 (staging)** | `staging` | STG Supabase / AWS STG |
| **Preview** | `develop`, `feature/*` | STG Supabase / AWS STG |

> STG（カスタム環境 staging）と develop（Preview）は同じ Supabase STG / AWS STG を共有する。
> カスタム環境を使うことで、STG 固有の環境変数を Preview とは独立して管理できる。

### Vercel PROD 環境変数

Vercel ダッシュボードの **Production** スコープに以下を設定する。

| 項目 | PROD の値 |
|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://voisychklptvavokrxox.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | PROD Supabase Dashboard → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | PROD Supabase Dashboard → Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | PROD Supabase Dashboard → Settings → API → JWT Secret |
| `SUPABASE_HOOK_SECRET` | PROD Supabase Dashboard → Auth → Hooks で設定した値 |
| `AWS_S3_BUCKET` | 本番用バケット名 |
| `AWS_CLOUDFRONT_URL` | `d11xeybks927fj.cloudfront.net`（本番用） |
| `NEXT_PUBLIC_SITE_URL` | `https://media.jobtv.jp` |
| `SKIP_ZEROTRUST_CHECK` | **設定しない** |

### PROD Supabase Dashboard 手動設定チェックリスト

PROD の Supabase Dashboard で以下を手動設定する：

- [ ] **Auth Hook（send_email）**: URI を `https://media.jobtv.jp/api/webhooks/email` に設定
- [ ] **Site URL**: `https://media.jobtv.jp`
- [ ] **Redirect URLs**: `https://media.jobtv.jp/**`
- [ ] **MFA（TOTP）**: enroll / verify を有効化
- [ ] **初期 admin ユーザー作成**: Dashboard → Authentication → Users から作成し、`profiles.role` を `admin` に設定

---

## Vercel デプロイ設定

### デプロイの仕組み

Vercel は Git 連携で自動的にデプロイする：

- **Production Branch**（= `main`）への push → **Production デプロイ**
- **`staging` ブランチ**への push → **カスタム環境 (staging) デプロイ**
- **それ以外のブランチ**への push → **Preview デプロイ**

### 対象プロジェクト

| Vercel プロジェクト | アプリ | Root Directory |
|---|---|---|
| `jobtv-app` | jobtv | `apps/jobtv` |

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

## Basic 認証（オプション）

### 方針

- 環境変数で Basic 認証を有効にできる。未設定のときは Basic 認証はかからない。
- `BASIC_AUTH_SCOPE` で認証の適用範囲を制御できる。

### 環境変数

| 環境変数 | 説明 |
|---------|------|
| `BASIC_AUTH_USER` | Basic 認証のユーザー名 |
| `BASIC_AUTH_PASSWORD` | Basic 認証のパスワード |
| `BASIC_AUTH_SCOPE` | 認証スコープ。`all`（デフォルト）= 全ルート、`admin` = `/admin` 配下のみ |

### 動作マトリクス

| `BASIC_AUTH_USER/PASSWORD` | `BASIC_AUTH_SCOPE` | 動作 |
|---|---|---|
| 未設定 | （任意） | Basic 認証なし |
| 設定済み | 未設定 or `all` | 全ルートに Basic 認証（後方互換） |
| 設定済み | `admin` | `/admin` 配下のみ Basic 認証（jobtv のみ。event-system / agent-manager はスキップ） |

### 運用フロー（PROD）

1. **サービスリリース前**: `BASIC_AUTH_SCOPE=all`（or 未設定）→ 全体に Basic 認証
2. **サービスリリース後**: `BASIC_AUTH_SCOPE=admin` に変更 → `/admin` のみ Basic 認証
3. **STG / ローカル**: 変更不要（`BASIC_AUTH_SCOPE` 未設定で現行どおり全体に Basic 認証）

切り替えは Vercel の環境変数を `all` → `admin` に変えて再デプロイするだけ。

### 実装

- **jobtv**: [apps/jobtv/proxy.ts](apps/jobtv/proxy.ts) — `scope === "all"` で全ルート、`scope === "admin"` で `/admin` 配下のみ認証
- **event-system / agent-manager**: admin ルートがないため、`scope === "admin"` 時は Basic 認証をスキップ

---

## Vercel Firewall

### 方針

- **セキュリティ制御は Vercel Firewall（インフラ側）で実施する。**
- リクエストがアプリに届く前に遮断できるため、アプリ側のコード変更は不要。
- 設定場所: Vercel ダッシュボード → プロジェクト (`jobtv-app`) → **Settings → Firewall → Rules**

### DDoS 対策

Vercel は全プラン共通で **DDoS 緩和（DDoS Mitigation）** を標準提供しており、追加設定は不要。

- **L3/L4（ネットワーク/トランスポート層）**: SYN flood・UDP reflection 等を PoP（エッジ拠点）レベルで遮断
- **L7（アプリケーション層）**: リクエストパターンのフィンガープリントにより攻撃的トラフィックを自動検出・ブロック
- **検出速度**: P50 2.5 秒 / P99 3.5 秒で緩和開始（最短 0.5 秒）
- **課金保護**: Firewall がブロックしたトラフィックは課金対象外（DDoS 攻撃によるコスト増を防止）

> 参考: [Vercel DDoS Mitigation](https://vercel.com/docs/vercel-firewall/ddos-mitigation)

### ルール一覧

| 優先度 | 対象パス | 種類 | 条件 | 目的 |
|--------|----------|------|------|------|
| **必須** | `/admin/*` | IP 制限 (Block) | 許可 IP 以外を 403 | 管理画面の保護 |
| **必須** | `/api/admin/*` | IP 制限 (Block) | 許可 IP 以外を 403 | 管理 API の保護（画面だけ塞いでも API 直叩きを防げないため） |
| 推奨 | `/api/auth/login` | Rate Limit | 10 req/min per IP | ブルートフォース対策（学生ログイン） |
| 推奨 | `/api/studio/login` | Rate Limit | 10 req/min per IP | ブルートフォース対策（企業ログイン） |
| 推奨 | `/api/cron/*` | Rate Limit | 1 req/min per IP | Cron エンドポイントの乱用防止（`CRON_SECRET` 認証との二重防御） |

> **許可 IP**: オフィス・VPN 等、運用で定めた一覧を設定する。

### Webhook について

以下は送信元 IP が変動するため Firewall での IP 制限は行わず、アプリ内認証に依存する。

| パス | 送信元 | アプリ内認証 |
|------|--------|-------------|
| `/api/webhooks/email` | Supabase Auth Hook | `SUPABASE_HOOK_SECRET` による検証 |
| `/api/webhooks/mediaconvert` | AWS SNS | SNS 署名検証 |

### 注意

- IP 制限は **認証・MFA（requireAdmin）とは別レイヤー** である。IP 許可後にログインし、TOTP 検証が必要。
- 開発・ステージング環境で admin に触る場合は、Vercel の環境別設定で許可 IP を設定するか、該当環境のみ制限を緩和する。
