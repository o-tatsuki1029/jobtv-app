# SEO・AIO 対策ガイド

## 概要

本ドキュメントは JOBTV の SEO（検索エンジン最適化）および AIO（AI 最適化）の実装状況をまとめたものです。
新機能追加・ページ追加の際はこのドキュメントを参照してください。

### 対象ページ一覧

| ページ | パス |
|--------|------|
| トップページ | `/` |
| 企業詳細 | `/company/[id]` |
| 求人詳細 | `/job/[id]` |
| 説明会詳細 | `/session/[id]` |
| 利用規約 | `/docs/terms` |
| マイページ（noindex） | `/mypage/*` |
| 管理画面（noindex） | `/admin/*`, `/studio/*` |

---

## グローバル SEO 設定

| 設定 | ファイル | 内容 |
|------|----------|------|
| metadataBase | `apps/jobtv/app/layout.tsx` | `SITE_URL` を基準 URL に設定 |
| デフォルト title | `apps/jobtv/app/layout.tsx` | `SITE_TITLE` を template 形式で設定 |
| デフォルト OGP 画像 | `apps/jobtv/app/opengraph-image.tsx` | 動的生成（Next.js ImageResponse） |
| robots.txt | `apps/jobtv/app/robots.ts` | 公開ページ許可・管理画面 noindex・AI クローラー許可 |
| sitemap.xml | `apps/jobtv/app/sitemap.ts` | 企業・求人・説明会の動的生成 + 静的ページ |
| manifest | `apps/jobtv/app/manifest.ts` | PWA 設定 |

### 共通定数（`apps/jobtv/constants/site.ts`）

```ts
SITE_NAME    = "JOBTV"
SITE_TITLE   = "JOBTV - 就活生向け動画情報メディア"
SITE_URL     = `https://${getSiteUrl(3000)}`   // 環境変数 NEXT_PUBLIC_SITE_URL から取得
OGP_IMAGE    = `${SITE_URL}/opengraph-image`
ROBOTS_CONFIG      // 公開ページ用（index: true）
ROBOTS_NOINDEX     // 管理画面用（index: false）
```

---

## AIO（AI 最適化）設定

### robots.txt（`apps/jobtv/app/robots.ts`）

以下の AI クローラーを明示的に許可しています：

- `GPTBot`（OpenAI）
- `Claude-Web`（Anthropic）
- `anthropic-ai`
- `PerplexityBot`
- `Googlebot-Extended`

管理画面（`/admin/*`, `/studio/*`）はすべてのクローラーに対して `Disallow`。

### llms.txt（`apps/jobtv/public/llms.txt`）

AI エージェント向けにサービス概要・主要ページ・API 情報を記述。
**新機能追加時はこのファイルも更新すること**（運用ルール）。

---

## ページ別 SEO 実装状況

| ページ | generateMetadata | JSON-LD | H1 | canonical | noindex |
|--------|-----------------|---------|-----|-----------|---------|
| トップ (`/`) | ✅ static export | VideoObject ItemList | ✅ HeroSection | — | — |
| 企業詳細 | ✅ 動的 | Organization + BreadcrumbList | ✅ CompanyMainHeader | ✅ 絶対 URL | — |
| 求人詳細 | ✅ 動的 | JobPosting + BreadcrumbList | ✅ JobDetailView | ✅ 絶対 URL | — |
| 説明会詳細 | ✅ 動的 | Event + BreadcrumbList | ✅ SessionDetailView | ✅ 絶対 URL | — |
| 利用規約 | ✅ static | WebPage | ✅ `<h1>` | — | — |
| マイページ | ✅ noindex 設定 | — | — | — | ✅ `requireCandidate()` |
| 管理画面 | ✅ noindex 設定 | — | — | — | ✅ |

---

## 構造化データ（JSON-LD）一覧

すべてのコンポーネントは `apps/jobtv/components/seo/` に配置。

| コンポーネント | スキーマ | 使用ページ |
|---------------|---------|-----------|
| `CompanyOrganizationJsonLd` | `Organization` | 企業詳細 |
| `JobPostingJsonLd` | `JobPosting` | 求人詳細 |
| `SessionEventJsonLd` | `Event` | 説明会詳細 |
| `BreadcrumbJsonLd` | `BreadcrumbList` | 企業・求人・説明会詳細 |
| `TermsWebPageJsonLd` | `WebPage` | 利用規約 |
| `VideoObjectListJsonLd` | `ItemList` + `VideoObject` | トップページ |

### BreadcrumbJsonLd

- `items` にトップページは不要（コンポーネントが自動付与）
- `path` はルート相対パス（例: `/company/xxx`）

```tsx
<BreadcrumbJsonLd items={[{ name: company.name, path: `/company/${id}` }]} />
```

### JobPostingJsonLd

主要フィールド: `title`, `description`, `hiringOrganization`（`Organization` スキーマ）, `jobLocation`, `datePosted`, `employmentType`

### SessionEventJsonLd

主要フィールド: `name`, `startDate`, `endDate`, `location`（`Place` または `VirtualLocation`）, `organizer`, `eventAttendanceMode`（`OnlineEventAttendanceMode` / `OfflineEventAttendanceMode`）

### VideoObjectListJsonLd

- `uploadDate` 未設定のため Google の Video リッチリザルトには非対応
- AI クローラー向けの動画コンテキスト提供が目的
- shortVideos と documentaryPrograms を結合して渡す

```tsx
<VideoObjectListJsonLd videos={[...shortVideos, ...documentaryPrograms]} />
```

---

## Core Web Vitals 対応

| 対応 | 詳細 |
|------|------|
| LCP 画像 `priority` | `CompanyMainHeader` のロゴ画像に `priority` 付与 |
| フォント `display:swap` | Google Fonts を使用する場合は `display=swap` を指定 |
| OGP 画像サイズ指定 | 各 generateMetadata で `width: 1200, height: 630` を指定 |
| 動画 `poster` 属性 | `VideoPlayer.tsx` でポスター画像を指定し初期描画を高速化 |

---

## 画像 alt テキストポリシー

- 求人カバー画像（`CompanyEntryModal`）: `alt={job.title}` — コンテンツ画像のため必須
- 企業ロゴ: `alt={company.name}` — コンテンツ画像のため必須
- 装飾目的の画像のみ `alt=""` を許容

---

## 今後の改善候補（低優先度）

- 企業・求人・説明会の一覧ページ追加（内部リンク強化）
- 動的 OGP 画像（企業・求人別の Next.js ImageResponse）
- プライバシーポリシーページ追加（WebPage JSON-LD を付与）
- 会社概要ページ追加（Organization JSON-LD を付与）
- sitemap 生成失敗の監視（アラート設定）
- llms.txt の更新を新機能追加時の運用チェックリストに追加
- `VideoObjectListJsonLd` に `uploadDate` を追加して Google Video リッチリザルトに対応
