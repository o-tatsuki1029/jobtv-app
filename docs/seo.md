# JobTV アプリ SEO 設計ドキュメント

## 1. 方針

- **管理画面（`/studio`・`/admin`）**: 検索エンジンにインデックスされないよう **厳守**（noindex / robots disallow）。
- **上記以外の公開ページ**: インデックス許可し、クロールしやすくして SEO 上位を狙う設計とする。

---

## 2. 現状のSEO設定一覧

### 2.1 ルートレイアウト（全ページ共通）

| 項目 | 設定内容 |
|------|----------|
| ファイル | `apps/jobtv/app/layout.tsx` |
| `metadataBase` | `SITE_URL` |
| `title` | default: 「JOBTV - 動画就活情報サイト」 / template: `%s | JOBTV` |
| `description` | 共通サイト説明文 |
| `keywords` | `SEO_KEYWORDS`（就活・採用動画・企業説明会 等） |
| `openGraph` | type, locale(ja_JP), url, title, description, siteName, images(1200x630) |
| `twitter` | card: summary_large_image, creator/site |
| `robots` | `ROBOTS_CONFIG`（index: true, follow: true, googleBot 指定あり） |
| `alternates.canonical` | ルートは `SITE_URL` |
| `viewport` | device-width, initialScale, themeColor |

定数は `apps/jobtv/constants/site.ts` で定義（`SITE_TITLE`, `SITE_DESCRIPTION`, `OGP_IMAGE`, `ROBOTS_CONFIG` 等）。

### 2.2 ページ別メタデータ（generateMetadata）

| ルート | 内容 |
|--------|------|
| `(main)/company/[id]` | 企業名・説明・OGP（カバー/ロゴ）・keywords・canonical |
| `(main)/session/[id]` | 説明会タイトル・企業名・説明・OGP・keywords・canonical |
| `(main)/job/[id]` | 求人タイトル・企業名・説明・OGP・keywords・canonical |

トップ `(main)/page.tsx` は `metadata.title`（absolute: SITE_TITLE）と `description` を明示的に設定済み。

### 2.3 その他SEO関連

| 種別 | ファイル | 内容 |
|------|----------|------|
| OGP画像 | `apps/jobtv/app/opengraph-image.tsx` | 動的OGP画像生成（1200x630） |
| 構造化データ | `app/JsonLd.tsx`、`components/seo/JobPostingJsonLd.tsx`、`SessionEventJsonLd.tsx` | Organization / WebSite（ルート）。求人: JobPosting、説明会: Event |
| サイトマップ | `apps/jobtv/app/sitemap.ts` | 動的（トップ + 企業・説明会・求人詳細） |
| robots | `apps/jobtv/app/robots.ts` | allow: /, disallow: /api/, /_next/, /studio/, /admin/, /auth/ |
| PWA | `apps/jobtv/app/manifest.ts` | アプリ名・アイコン・theme_color 等 |

---

## 3. 管理画面の非インデックス化（厳守）

### 3.1 対象パス

- `/studio/*` … スタジオ（企業向け管理画面）
- `/admin/*` … 管理者向け管理画面

### 3.2 実装方針

1. **メタデータで noindex**
   - `apps/jobtv/app/studio/layout.tsx` に `metadata.robots = { index: false, follow: false }` を設定。
   - `apps/jobtv/app/admin/layout.tsx` を新設し、同様に `robots: { index: false, follow: false }` を設定（admin 配下全体に適用）。

2. **robots.txt でクロール禁止**
   - `apps/jobtv/app/robots.ts` の `disallow` に `/studio/` と `/admin/` を追加し、検索エンジンのクロール対象から外す。

上記の二重設定で「インデックスに載せない」ことを厳守する。

---

## 4. 公開ページのインデックス・クロール最適化

### 4.1 インデックス許可

- ルートレイアウトの `robots` は現状どおり index/follow で問題なし。
- **studio / admin 以外**はレイアウトで上書きしない限り index される。

### 4.2 サイトマップでクロールしやすくする

- **対象**: トップ + 公開される企業・説明会・求人詳細。
- **実装**: `apps/jobtv/app/sitemap.ts` を動的化する。
  - トップ: 従来どおり `priority: 1`, `changeFrequency: "daily"`。
  - 企業: `company_pages.status = 'active'` の `company_id` から `/company/[id]` を列挙。
  - 説明会: `sessions.status = 'active'` の `id` から `/session/[id]` を列挙。
  - 求人: `job_postings.status = 'active'` の `id` から `/job/[id]` を列挙。
- 各詳細ページは `lastModified`（可能なら DB の updated_at）、`changeFrequency`（例: weekly）、`priority`（例: 0.8）を設定し、クロール優先度を付与。

### 4.3 その他（対応済み）

- トップページ: `title`（absolute）/ `description` を明示設定済み。
- 構造化データ: 求人ページに JobPosting、説明会ページに Event スキーマを追加済み（`JobPostingJsonLd` / `SessionEventJsonLd`）。
- canonical: 詳細ページは既に `alternates.canonical` を設定済みのため継続利用。

---

## 5. 課題一覧（タスクとしての整理）

以下は **すべて対応済み**。

| # | 課題 | 優先度 | 対応状況 |
|---|------|--------|----------|
| 1 | studio / admin を検索エンジンに載せない | 必須 | ✅ layout の metadata.robots で noindex + robots.txt で /studio/, /admin/ を disallow |
| 2 | サイトマップがトップのみ | 高 | ✅ sitemap.ts を動的化（企業・説明会・求人詳細URL、lastModified/weekly/priority 0.8） |
| 3 | トップページのメタデータがデフォルトのみ | 中 | ✅ (main)/page で metadata（title: absolute, description）を明示 |
| 4 | 認証系ページ（/auth/*）の扱い | 低 | ✅ auth/layout で noindex + robots.txt で /auth/ を disallow |
| 5 | 構造化データの拡張 | 低 | ✅ 求人ページに JobPosting、説明会ページに Event スキーマを追加 |

---

## 6. ファイル変更まとめ

以下は **すべて実装済み** とする。

- **追加**: `apps/jobtv/app/admin/layout.tsx` … noindex メタデータで管理画面を非インデックス化
- **追加**: `apps/jobtv/components/seo/JobPostingJsonLd.tsx` … 求人詳細ページ用 JobPosting 構造化データ
- **追加**: `apps/jobtv/components/seo/SessionEventJsonLd.tsx` … 説明会詳細ページ用 Event 構造化データ
- **変更**: `apps/jobtv/app/studio/layout.tsx` … noindex メタデータ追加
- **変更**: `apps/jobtv/app/auth/layout.tsx` … noindex メタデータ追加（認証系を非インデックス化）
- **変更**: `apps/jobtv/app/robots.ts` … disallow に `/studio/`, `/admin/`, `/auth/` を追加
- **変更**: `apps/jobtv/app/sitemap.ts` … 動的 sitemap（トップ + 企業・説明会・求人、lastModified/weekly/priority 0.8）
- **変更**: `apps/jobtv/app/(main)/page.tsx` … トップ用 metadata（title: absolute, description）を明示
- **変更**: `apps/jobtv/app/(main)/job/[id]/page.tsx` … JobPostingJsonLd を組み込み
- **変更**: `apps/jobtv/app/(main)/session/[id]/page.tsx` … SessionEventJsonLd を組み込み
- **定数**: `apps/jobtv/constants/site.ts` に `ROBOTS_NOINDEX` を追加し、studio / admin / auth で共通利用

これにより、管理画面・認証系は検索エンジンに載せず、公開ページはインデックス・クロールしやすく、構造化データも整えた設計になっている。
