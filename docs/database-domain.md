# DB・ドメイン解釈（公式・統合）

この doc はプロジェクト全体の DB・ドメインの用語・テーブル・振る舞いの公式な解釈をまとめた唯一の拠り所とする。実装はここに合わせる。

**DB に変更を加えたとき**（マイグレーション・テーブル役割・使用ルールの変更）は、必ずこの doc を更新する。該当セクションの「参照実装」に挙がる他機能が同じ解釈で揃っているか確認し、用語・振る舞いを変える場合は先にこの doc を更新してから実装を合わせる。

機能ごとのテスト項目・バグ候補は別 doc（例: 企業ページは `docs/test/company-page-flow.md`）を参照。

---

## この doc の使い方

| 目的 | 参照する場所 |
|------|--------------|
| 用語の意味・どのテーブルが何を表すか | 各ドメインの「用語とデータの対応」「テーブル定義」 |
| 画面上の振る舞い・状態遷移の解釈 | 各ドメインの「要件（振る舞いの解釈）」 |
| テーブルを触るコードを変更するときの影響範囲 | 各ドメインの「参照実装」 |
| テスト観点・バグ候補 | `docs/test/` 配下のテスト用 doc |

---

## 全体の前提（ドラフト／本番パターン）

JOBTV では、スタジオで編集し管理者審査を経てから公開する機能について、次のパターンでテーブルが分かれている。

- **本番テーブル**（例: `company_pages`）: 公開サイトに表示されるデータ。審査承認後に更新される。公開のオン/オフは `status` などで制御。
- **ドラフトテーブル**（例: `company_pages_draft`）: スタジオで編集する一時データ。`draft_status` で下書き / 審査中 / 承認済み / 却下 を管理。承認時に本番へ反映。
- **共通**: 型定義は `packages/shared/types/database.types.ts`（`pnpm types` で自動生成）。マイグレーションは `supabase/migrations/` で一元管理。

### 未認証（anon）で取得できるデータ（公開サイト用）

| データ | 取得方法・条件 |
|--------|----------------|
| 企業一覧・企業基本情報 | `companies` を SELECT 可能（ポリシー: Public can view companies） |
| 企業ページ（本番） | `company_pages` を SELECT 可能（アプリで `status = 'active'` のもののみ表示） |
| 求人 | `job_postings` の `status = 'active'` のみ SELECT 可能 |
| 説明会 | `sessions` の `status = 'active'` のみ SELECT 可能 |
| 説明会日程 | `session_dates` は公開中説明会に紐づく行のみ SELECT 可能 |
| 説明会の満席表示用「予約数」 | RPC `get_public_session_date_reservation_counts(session_date_ids)` で日程別件数のみ取得（予約の個人情報は返さない） |
| 動画 | `videos` の `status = 'active'` のみ SELECT 可能 |
| トップ掲載の選択 | `top_page_featured_videos` を SELECT 可能（トップページで表示する動画の video_id 一覧の取得に使用） |
| トップページヒーローアイテム | `top_page_hero_items` を SELECT 可能（トップページのヒーローセクション表示に使用） |
| トップページバナー | `top_page_banners` を SELECT 可能（トップページのバナー表示に使用） |
| トップページアンバサダー | `top_page_ambassadors` を SELECT 可能（トップページのアンバサダー表示に使用） |
| トップページ就活ドキュメンタリー | `top_page_documentaries` を SELECT 可能（トップページの就活ドキュメンタリー表示に使用） |
| トップページしゅんダイアリー | `top_page_shun_diaries` を SELECT 可能（トップページのしゅんダイアリー表示に使用） |
| LP サンプル動画 | `lp_sample_videos` を SELECT 可能（法人LP のサンプル動画表示に使用） |
| LP FAQ | `lp_faq_items` を SELECT 可能（法人LP の FAQ 表示に使用） |
| LP 企業ロゴ | `lp_company_logos` を SELECT 可能（法人LP の導入企業ロゴ表示に使用） |
| LP スクロールバナー | `lp_scroll_banner` を SELECT 可能（法人LP の右下スクロールバナー表示に使用） |
| 学校マスタ | `school_master` を SELECT 可能（学校名・学部名の検索補完に使用） |

**未認証では取得できないもの（認証必須・スタジオ/管理画面用）**

- `session_reservations` の行（誰が予約したか）。件数だけは上記 RPC で取得可能。
- 求人への応募内容（`applications` / `application_progress` 等）。
- ドラフト系テーブル（`*_draft`）。プロフィール（`profiles`）の他ユーザー分。
- イベント系テーブル（`events`, `event_reservations`, `event_companies` 等）。
- 電話管理（`phone_calls`, `phone_call_lists`, `phone_call_list_items`）、CA面談（`ca_interviews`）、コメントテンプレート（`comment_templates`）。
- 通知（`notifications`, `notification_reads`）、メールテンプレート（`email_templates`）、メールログ（`email_logs`）。
- 候補者管理（`candidates`, `candidate_management`）。

> **anon GRANT ルール**: 上記の公開テーブルは anon に SELECT のみ許可。INSERT/UPDATE/DELETE は全テーブルで anon から REVOKE 済み。非公開テーブルは anon から ALL を REVOKE 済み。

---

## 企業ページ

スタジオの企業ページ管理（`/studio/company`）、公開の企業ページ（`/company/[id]`）、管理者審査（`/admin/review` の企業ページタブ）で扱うデータの解釈。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| 企業基本情報 | `companies` | 企業名・ロゴ・業界・従業員数・電話番号・売上高・平均年齢・上場区分・過去サービスID・Facebook URLなど。企業情報の審査は `companies_draft`。企業ページとは別機能。 |
| 企業ページ（本番） | `company_pages` | 公開サイトに表示する企業ページ内容。1 企業 1 行（`company_id` に紐づく）。 |
| 企業ページ（ドラフト） | `company_pages_draft` | スタジオで編集する企業ページの下書き。審査申請・承認・却下のライフサイクルを持つ。 |

- **スタジオ「企業ページ管理」**: `company_pages_draft` の編集・保存・審査申請・および承認済み時の本番公開トグル。
- **公開ページ**: `companies` と `company_pages`（`status = 'active'`）をマージして表示。求人・動画・説明会も同じ企業 ID で取得して表示。
- **admin/review の「企業ページ」タブ**: `company_pages_draft` のうち `draft_status = 'submitted'` の一覧を表示し、承認・却下を行う。

### テーブル定義（解釈上の要点）

**company_pages（本番）**

- `company_id`: 企業 1 件に 1 行。UNIQUE。
- `status`: 公開状態。`company_page_status` 型。
  - `active`: 公開中。公開 URL で表示される。
  - `closed`: 非公開。公開 URL では 404 扱いとする。
- その他: `tagline`（キャッチコピー）、`description`（会社紹介文）、`cover_image_url`、SNS 系、`benefits`（福利厚生）、動画関連の JSON など。

**company_pages_draft（ドラフト）**

- `company_id`: どの企業のドラフトか。1 企業で複数ドラフトが存在しうる（履歴）。
- `draft_status`: 審査ライフサイクル。`draft_status` 型。
  - `draft`: 下書き。編集・保存・審査申請が可能。
  - `submitted`: 審査申請済み。編集はロック（読み取り専用）。
  - `approved`: 承認済み。本番に反映済み。`production_page_id` が設定される。
  - `rejected`: 却下済み。
- `production_page_id`: 承認後に、反映先の `company_pages.id` を指す。同一 `company_id` の本番 1 件に対応。

### 要件（振る舞いの解釈）

#### スタジオ（`/studio/company`）

- **アクセス**: リクルーターまたは管理者のみ。レイアウトで `requireRecruiterOrAdmin()`。
- **対象データ**: 自社の `company_pages_draft`。実装上は「編集対象 1 件」を選ぶ（例: 下書き 1 件、または最新の submitted/approved/rejected 1 件）。
- **保存**: `company_pages_draft` のみ INSERT/UPDATE。本番テーブルは変更しない。ドラフトが無い場合は新規作成。
- **審査申請**: 必須項目（キャッチコピー・会社紹介文など）を満たしている場合のみ可能。申請時に `draft_status` を `submitted` に更新。審査中は編集ロック（読み取り専用）。
- **公開トグル**: 承認済みドラフトが存在し、かつ本番の `company_pages` が存在する場合のみ、`company_pages.status` を `active` / `closed` で切り替え可能。

#### 公開ページ（`/company/[id]`）

- **アクセス**: 認証不要。誰でも閲覧可能。
- **表示データ**: `companies` の 1 件（`id` が URL の `[id]`）と、`company_pages` の 1 件（同一 `company_id` かつ `status = 'active'`）をマージ。さらに求人（`job_postings`）、動画（`videos`）、説明会（`sessions`）を status=active で取得して表示。
- **404 とする条件**（解釈の正）:
  - 企業（`companies`）が存在しない、または取得処理がエラー/null を返した場合。
  - `company_pages` が存在し、かつ `status !== 'active'` の場合（企業ページが非公開のとき）。
- **特例**: `id === 'uid'` のときはモックデータを表示（開発/デモ用）。<!-- TODO: 本番デプロイ前に環境変数制御を実装すること -->

#### 管理者審査（`/admin/review` の「企業ページ」タブ）

- **アクセス**: 管理者のみ。`requireAdmin()`。
- **一覧**: `company_pages_draft` のうち `draft_status = 'submitted'` を取得。企業名・説明・ロゴなどを表示。
- **プレビュー**: 審査対象ドラフトの内容を、プレビュー用 URL（例: `/studio/company/preview-content`）で iframe 等表示。postMessage でデータを渡す。
- **承認**: ドラフトの内容で `company_pages` を更新または新規作成し、`status = 'active'` に設定。該当ドラフトの `draft_status` を `approved`、`production_page_id` に本番の `company_pages.id` を設定。同一 `company_id` で既存の `company_pages` があれば UPDATE、無ければ INSERT。
- **却下**: ドラフトの `draft_status` を `rejected` に更新。本番テーブルは変更しない。

### 参照実装（企業ページ）

テーブル・概念を変更するときは、以下が同じ解釈で揃っているか確認する。

| 役割 | パス（jobtv） |
|------|----------------|
| スタジオ・企業ページ編集 | `app/studio/company/page.tsx` |
| スタジオ・プレビュー用中身 | `app/studio/company/preview-content/page.tsx` |
| 公開ページ | `app/(main)/company/[id]/page.tsx` |
| 審査一覧（企業ページタブ含む） | `app/admin/(dashboard)/review/page.tsx` |
| 企業ページ審査カード | `components/admin/review/ReviewCompanyPageCard.tsx` |
| 企業ページ保存・申請・トグル | `lib/actions/company-page-actions.ts` |
| 企業プロフィール取得（スタジオ・公開用） | `lib/actions/company-profile-actions.ts` |
| 審査取得・承認・却下 | `lib/actions/admin-actions.ts`（getAllCompaniesForReview, approveCompanyPage, rejectCompanyPage） |
| スタジオ企業ページ用フック | `hooks/useCompanyProfile.ts` |
| admin 企業詳細・企業ページタブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/CompanyPageTab.tsx` |
| admin 企業ページ審査バイパス保存 | `lib/actions/admin-company-detail-actions.ts`（adminGetCompanyPageData, adminSaveCompanyPage） |

---

## 求人（job_postings）

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| 求人（本番） | `job_postings` | 公開サイトに表示する求人。`status`（active/closed）で公開制御。 |
| 求人（ドラフト） | `job_postings_draft` | スタジオで編集する求人の下書き。審査申請・承認・却下のライフサイクルを持つ。 |

### テーブル定義（解釈上の要点）

**job_postings（本番）**

- `status`: `job_status` 型。`active`（公開）/ `closed`（非公開）。
- 承認時に admin が INSERT または UPDATE する。スタジオからは直接 INSERT/UPDATE しない（公開トグルで `status` を変えるのみ）。

**job_postings_draft（ドラフト）**

- `draft_status`: 審査ライフサイクル。
  - `draft`: 下書き。編集・保存・審査申請が可能。
  - `submitted`: 審査申請済み。編集ロック。
  - `approved`: 承認済み。本番に反映済み。`production_job_id` が設定される。
  - `rejected`: 却下済み。
- `production_job_id`: 承認後に反映先の `job_postings.id` を指す。初回承認前は NULL。

### 利用範囲ルール

| 利用者 | テーブル | 画面・用途 | 操作 |
|--------|----------|-----------|------|
| candidate | `job_postings` | 公開ページ・エントリー | SELECT（status=active のみ） |
| recruiter | `job_postings` | スタジオ（公開 ON/OFF トグル） | UPDATE(status) |
| admin | `job_postings` | 承認時のみ自動 | INSERT / UPDATE |
| recruiter | `job_postings_draft` | スタジオ一覧・編集・審査申請 | SELECT / INSERT / UPDATE |
| admin | `job_postings_draft` | 審査画面（承認・却下） | SELECT / UPDATE(draft_status) |

### ID の取り扱いルール

- スタジオ画面・admin 審査画面では常に **ドラフト ID**（`job_postings_draft.id`）を主キーとして扱う。
- `approveJob(draftId)` / `rejectJob(draftId)` には必ず `job_postings_draft.id` を渡す。`production_job_id` は渡さない。
- `production_job_id` は以下の用途にのみ使用する: 公開 ON/OFF トグル操作、応募数カウント。

### 参照実装（求人）

| 役割 | パス（jobtv） |
|------|----------------|
| スタジオ・求人一覧 | `app/studio/(dashboard)/jobs/page.tsx` |
| 求人保存・申請・公開トグル | `lib/actions/job-actions.ts` |
| 審査一覧取得・承認・却下 | `lib/actions/admin-actions.ts`（getAllJobsForReview, approveJob, rejectJob） |
| admin 審査画面 | `app/admin/(dashboard)/jobs/page.tsx` |
| 公開ページ | `app/(main)/company/[id]/page.tsx` |
| admin 企業詳細・求人タブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/JobsTab.tsx` |
| admin 求人審査バイパス保存 | `lib/actions/admin-company-detail-actions.ts`（adminGetJobsForCompany, adminSaveJob） |

---

## 説明会（sessions）

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| 説明会（本番） | `sessions` | 公開サイトに表示する説明会。`session_status`（active/closed）で公開制御。 |
| 説明会（ドラフト） | `sessions_draft` | スタジオで編集する説明会の下書き。審査申請・承認・却下のライフサイクルを持つ。 |
| 説明会日程 | `session_dates` | 本番説明会に紐づく開催日時。`session_id` → `sessions.id`（本番）。 |
| 説明会日程（ドラフト） | `session_dates_draft` | ドラフト説明会に紐づく日程。審査申請・承認時に `session_dates` へ反映。 |
| 予約 | `session_reservations` | `session_date_id` → `session_dates.id`（本番） → `sessions.id`（本番）。 |

### テーブル定義（解釈上の要点）

**sessions（本番）**

- `status`: `session_status` 型。`active`（公開）/ `closed`（非公開）。
- 承認時に admin が INSERT または UPDATE する。スタジオからは直接 INSERT/UPDATE しない（公開トグルで `status` を変えるのみ）。

**sessions_draft（ドラフト）**

- `draft_status`: 審査ライフサイクル。
  - `draft`: 下書き。編集・保存・審査申請が可能。
  - `submitted`: 審査申請済み。編集ロック。
  - `approved`: 承認済み。本番に反映済み。`production_session_id` が設定される。
  - `rejected`: 却下済み。
- `production_session_id`: 承認後に反映先の `sessions.id` を指す。初回承認前は NULL。

### 利用範囲ルール

| 利用者 | テーブル | 画面・用途 | 操作 |
|--------|----------|-----------|------|
| candidate | `sessions` | 公開ページ・予約フォーム | SELECT（status=active のみ） |
| recruiter | `sessions` | スタジオ（公開 ON/OFF トグル） | UPDATE(status) |
| admin | `sessions` | 承認時のみ自動 | INSERT / UPDATE |
| recruiter | `sessions_draft` | スタジオ一覧・編集・審査申請 | SELECT / INSERT / UPDATE |
| admin | `sessions_draft` | 審査画面（承認・却下） | SELECT / UPDATE(draft_status) |

### ID の取り扱いルール

- スタジオ画面・admin 審査画面では常に **ドラフト ID**（`sessions_draft.id`）を主キーとして扱う。
- `approveSession(draftId)` / `rejectSession(draftId)` には必ず `sessions_draft.id` を渡す。`production_session_id` は渡さない。
- `production_session_id` は以下の用途にのみ使用する: 公開 ON/OFF トグル操作、予約数カウント、候補者管理の絞り込み（`session_reservations.session_date_id` → `session_dates.session_id` → `sessions.id` の本番 ID で照合）。

### 参照実装（説明会）

| 役割 | パス（jobtv） |
|------|----------------|
| スタジオ・説明会一覧 | `app/studio/(dashboard)/sessions/page.tsx`（未作成の場合は今後追加） |
| 説明会保存・申請・公開トグル | `lib/actions/session-actions.ts`（または相当の actions） |
| 審査一覧取得・承認・却下 | `lib/actions/admin-actions.ts`（getAllSessionsForReview, approveSession, rejectSession） |
| admin 審査画面 | `app/admin/(dashboard)/sessions/page.tsx` |
| 公開ページ | `app/(main)/company/[id]/page.tsx` |
| admin 企業詳細・説明会タブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/SessionsTab.tsx` |
| admin 説明会審査バイパス保存 | `lib/actions/admin-company-detail-actions.ts`（adminGetSessionsForCompany, adminSaveSession） |

---

## 動画（videos）

- **本番**: `videos`。公開サイトの動画一覧・再生。`status` で公開制御。
- **ドラフト**: `videos_draft`。スタジオで編集し、審査承認後に本番へ反映する想定。MediaConvert 連携などは `docs/aws-video.md` 参照。
- **トップの就活Shorts・就活ドキュメンタリー**: トップページの該当セクションには、admin が `top_page_featured_videos` で選択した動画のみ表示する。企業ページ内のショート/ドキュメンタリーは従来どおり `videos` を category で取得。

### 要件（振る舞いの解釈）・スタジオ動画管理（`/studio/videos`）

- **編集・削除**: 一覧では**編集ボタンのみ表示**。動画の削除機能は提供しない。すべての動画で編集可能。編集保存時、既に承認済み（submitted/approved/rejected）のドラフトは `draft` に戻り、**再申請・再審査**が必要になる（`video-actions.ts` の `updateVideoDraft` 参照）。
- **一覧のタブ**: カテゴリ（メインビデオ・ショート動画・動画）ごとにタブを表示。タブは**ラベル幅のみ**（全幅ではない）。タブごとに URL を分ける（`?tab=main` / `?tab=short` / `?tab=documentary`）。
- **新規追加**: 右上の「新規動画を追加」は、**現在のタブのカテゴリ**をクエリ（`?category=`）で作成画面に渡す。**カテゴリ別の動画数が上限**（メインビデオ 1 件、ショート・動画は各 10 件）に達している場合は追加ボタンを無効化する。
- **作成・編集画面**: 開いていたタブ（新規時はクエリの `category`）のカテゴリを**初期選択し変更不可**。動画の向きの項目はなく、アップロードは横長（16:9）固定。動画ファイル入力の下に**推奨サイズ**（1920×1080）を表示する。
- 用語・振る舞いの詳細、参照実装一覧は、必要に応じてこの doc にセクションを追加する。DB 変更時は必ず該当箇所を更新する。

### 参照実装（動画）

| 役割 | パス（jobtv） |
|------|----------------|
| スタジオ・動画管理 | `app/studio/(dashboard)/videos/page.tsx` |
| 動画アップロード・ドラフト保存 | `lib/actions/video-actions.ts` |
| 審査取得・承認・却下 | `lib/actions/admin-video-actions.ts`（approveVideo, rejectVideo） |
| admin 企業詳細・動画タブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/VideosTab.tsx` |
| admin 動画審査バイパス保存 | `lib/actions/admin-company-detail-actions.ts`（adminGetVideosForCompany, adminSaveVideo） |

---

## トップ掲載コンテンツ（就活Shorts・就活ドキュメンタリー）

トップページの「就活Shorts」「就活ドキュメンタリー」に**どの企業のどの動画を表示するか**を、admin が選択・並び替えするだけの機能。入稿ではなく既存の `videos` を参照する。審査フローはない。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| トップに表示する動画の選択 | `top_page_featured_videos` | トップに表示する動画を `videos.id`（video_id）で参照。`kind` で就活Shorts / 就活ドキュメンタリーのどちらに表示するかを区別。`display_order` で表示順。**注意: `kind='documentary'` は UI 上「就活Videos」と表示される（テーブル値はそのまま `'documentary'`）。** |

### テーブル定義（解釈上の要点）

**top_page_featured_videos**

- `video_id`: トップに表示する動画（`videos.id`）。ON DELETE CASCADE。
- `kind`: `'short'`（就活Shorts）または `'documentary'`（就活ドキュメンタリー）。
- `display_order`: 表示順（昇順）。同一 kind 内で並び替えに使用。
- **UNIQUE(video_id)**: 1 本の動画はトップのいずれか一方のセクションにのみ登録可能。

### 要件（振る舞いの解釈）

- **トップページ**: `top_page_featured_videos` で選択された video_id のみ、`videos`（`status = 'active'`）と `companies(name)` を結合して表示。選択されていない動画はトップには表示しない。表示ロジック・UI は従来どおり（ShortVideoSection / ProgramSection）。
- **admin（`/admin/featured-videos`）**: 管理者のみ。タブで「就活Shorts」「就活ドキュメンタリー」を切り替え、各タブで「現在トップに表示している動画」の一覧・トップから外す・順番変更と、「トップに追加できる動画」から既存動画を選んで追加するのみ。入稿フォームはない。

### 参照実装（トップ掲載コンテンツ）

| 役割 | パス（jobtv） |
|------|----------------|
| トップページでの取得 | `app/(main)/page.tsx`（getPublicVideosForTopPage） |
| トップ用公開取得 | `lib/actions/video-actions.ts`（getPublicVideosForTopPage） |
| 管理用取得・追加・削除・並び替え | `lib/actions/top-page-featured-actions.ts` |
| 管理画面 | `app/admin/(dashboard)/featured-videos/page.tsx` |

---

## トップページヒーローアイテム（top_page_hero_items）

トップページのヒーローセクションに表示するスライドアイテムを admin が管理する機能。ドラフト/審査フローはなく、admin が直接 INSERT/UPDATE/DELETE する。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| ヒーローアイテム | `top_page_hero_items` | トップページのヒーローセクションに表示するスライド。タイトル・説明・サムネ・動画URL・チャンネル・PRフラグ・もっと見るURL・表示順を管理。 |

### テーブル定義（解釈上の要点）

**top_page_hero_items**

- `id`: uuid。
- `title`: スライドのタイトル（必須）。
- `description`: 説明文。
- `thumbnail_url`: サムネイル画像の公開URL。Supabase storage `company-assets` バケットの `admin/hero-items/{id}/{timestamp}.{ext}` にアップロード。
- `video_url`: 動画の URL（外部CDN等）。NULL の場合はサムネのみ表示。
- `channel`: チャンネル名。デフォルト `'JOBTV'`。
- `viewers`: 視聴者数（任意）。
- `is_pr`: PR フラグ。true の場合は PR バッジを表示。
- `link_url`: 「もっと見る」ボタンのクリック先URL。NULL の場合はボタンを非表示。
- `display_order`: 表示順（昇順）。
- **RLS**: anon・authenticated が SELECT 可能。INSERT/UPDATE/DELETE は admin ロールのみ。

### 参照実装（ヒーローアイテム）

| 役割 | パス（jobtv） |
|------|----------------|
| トップページでの取得・表示 | `app/(main)/page.tsx`（getTopPageHeroItems） |
| 公開用取得 | `lib/actions/top-page-hero-actions.ts`（getTopPageHeroItems） |
| 管理用取得・追加・更新・削除・並び替え | `lib/actions/top-page-hero-actions.ts` |
| 管理画面 | `app/admin/(dashboard)/hero-items/page.tsx` |
| 表示コンポーネント | `components/HeroSection.tsx` |

---

## トップページバナー（top_page_banners）

トップページに表示するバナーを admin が管理する機能。ドラフト/審査フローはなく、admin が直接 INSERT/UPDATE/DELETE する。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| トップページバナー | `top_page_banners` | トップページに表示するバナー。タイトル・画像URL・遷移先URL・表示順を管理。 |

### テーブル定義（解釈上の要点）

**top_page_banners**

- `id`: uuid。
- `title`: バナーのタイトル。
- `image_url`: バナー画像の公開URL。Supabase storage `company-assets` バケットの `admin/banners/{id}/{timestamp}.{ext}` にアップロード。
- `link_url`: クリック時の遷移先URL。NULL の場合はクリックしても遷移しない。
- `display_order`: 表示順（昇順）。
- **RLS**: anon・authenticated が SELECT 可能。INSERT/UPDATE/DELETE は admin ロールのみ。

### 参照実装（トップページバナー）

| 役割 | パス（jobtv） |
|------|----------------|
| トップページでの取得・表示 | `app/(main)/page.tsx`（getTopPageBanners） |
| 公開用取得 | `lib/actions/top-page-banner-actions.ts`（getTopPageBanners） |
| 管理用取得・追加・更新・削除・並び替え | `lib/actions/top-page-banner-actions.ts` |
| 管理画面 | `app/admin/(dashboard)/banners/page.tsx` |

---

## トップページアンバサダー（top_page_ambassadors）

トップページに表示するアンバサダーを admin が管理する機能。ドラフト/審査フローはなく、admin が直接 INSERT/UPDATE/DELETE する。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| トップページアンバサダー | `top_page_ambassadors` | トップページに表示するアンバサダー。名前・アバター画像URL・遷移先URL・表示順を管理。 |

### テーブル定義（解釈上の要点）

**top_page_ambassadors**

- `id`: uuid（PK）。
- `name`: アンバサダーの名前（必須）。
- `avatar_url`: アバター画像の公開URL。
- `link_url`: クリック時の遷移先URL。NULL の場合はクリックしても遷移しない。
- `display_order`: 表示順（昇順）。
- `created_at`, `updated_at`: タイムスタンプ。
- **RLS**: anon・authenticated が SELECT 可能。INSERT/UPDATE/DELETE は admin ロールのみ。

### 参照実装（トップページアンバサダー）

| 役割 | パス（jobtv） |
|------|----------------|
| 管理画面 | `app/admin/(dashboard)/featured-videos/page.tsx` |

---

## トップページ就活ドキュメンタリー（top_page_documentaries）

トップページに表示する就活ドキュメンタリー動画を admin が管理する機能。ドラフト/審査フローはなく、admin が直接 INSERT/UPDATE/DELETE する。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| トップページ就活ドキュメンタリー | `top_page_documentaries` | トップページに表示する就活ドキュメンタリー動画。タイトル・サムネイル画像URL・遷移先URL・チャンネル名・表示順を管理。 |

### テーブル定義（解釈上の要点）

**top_page_documentaries**

- `id`: uuid（PK）。
- `title`: 動画のタイトル（必須）。
- `thumbnail_url`: サムネイル画像の公開URL。
- `link_url`: クリック時の遷移先URL。NULL の場合はクリックしても遷移しない。
- `channel`: チャンネル名。デフォルト `'JOBTV'`。
- `display_order`: 表示順（昇順）。
- `created_at`, `updated_at`: タイムスタンプ。
- **RLS**: anon・authenticated が SELECT 可能。INSERT/UPDATE/DELETE は admin ロールのみ。

### 参照実装（トップページ就活ドキュメンタリー）

| 役割 | パス（jobtv） |
|------|----------------|
| 管理画面 | `app/admin/(dashboard)/featured-videos/page.tsx` |

---

## トップページしゅんダイアリー（top_page_shun_diaries）

トップページに表示するしゅんダイアリー動画を admin が管理する機能。ドラフト/審査フローはなく、admin が直接 INSERT/UPDATE/DELETE する。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| トップページしゅんダイアリー | `top_page_shun_diaries` | トップページに表示するしゅんダイアリー動画。タイトル・サムネイル画像URL・遷移先URL・チャンネル名・表示順を管理。 |

### テーブル定義（解釈上の要点）

**top_page_shun_diaries**

- `id`: uuid（PK）。
- `title`: 動画のタイトル（必須）。
- `thumbnail_url`: サムネイル画像の公開URL。
- `link_url`: クリック時の遷移先URL。NULL の場合はクリックしても遷移しない。
- `channel`: チャンネル名。デフォルト `'しゅんダイアリー'`。
- `display_order`: 表示順（昇順）。
- `created_at`, `updated_at`: タイムスタンプ。
- **RLS**: anon・authenticated が SELECT 可能。INSERT/UPDATE/DELETE は admin ロールのみ。

### 参照実装（トップページしゅんダイアリー）

| 役割 | パス（jobtv） |
|------|----------------|
| 管理画面 | `app/admin/(dashboard)/featured-videos/page.tsx` |

---

## LP サンプル動画（lp_sample_videos）

- **用途**: 法人LP（`/service/recruitment-marketing`）のサンプル動画セクションに表示するショート動画。
- **ドラフト/審査**: 不要。admin が直接 CRUD する。
- **RLS**: `anon, authenticated` → SELECT のみ。`authenticated` + `role = 'admin'` → ALL。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| LP サンプル動画 | `lp_sample_videos` | 動画URL・タグ・タイトル・説明・再生時間・表示順を管理。 |

### テーブル定義

**lp_sample_videos**

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| video_url | text NOT NULL | Supabase Storage の公開URL |
| thumbnail_url | text | 動画サムネイル画像URL（自動生成）。NULL の場合は `<video preload="metadata">` で代替表示。 |
| tag | text NOT NULL | "企業説明" 等 |
| title | text NOT NULL | |
| description | text NOT NULL | |
| duration | text NOT NULL | "01:13" 等（表示用） |
| display_order | integer NOT NULL DEFAULT 0 | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 参照実装（LP サンプル動画）

| 役割 | パス（jobtv） |
|------|----------------|
| Server Actions | `lib/actions/lp-sample-video-actions.ts` |
| 管理画面 | `app/admin/(dashboard)/lp-content/page.tsx` |
| 管理画面コンポーネント | `components/admin/LpSampleVideosContent.tsx` |
| 公開表示 | `app/service/recruitment-marketing/page.tsx` |

---

## LP FAQ（lp_faq_items）

- **用途**: 法人LP の FAQ セクションに表示する質問・回答。
- **ドラフト/審査**: 不要。admin が直接 CRUD する。
- **RLS**: `anon, authenticated` → SELECT のみ。`authenticated` + `role = 'admin'` → ALL。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| LP FAQ | `lp_faq_items` | 質問・回答（プレーンテキスト、改行は `\n`）・表示順を管理。 |

### テーブル定義

**lp_faq_items**

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| question | text NOT NULL | |
| answer | text NOT NULL | プレーンテキスト。改行は `\n` で保持し表示時に `<br />` に変換。 |
| display_order | integer NOT NULL DEFAULT 0 | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 参照実装（LP FAQ）

| 役割 | パス（jobtv） |
|------|----------------|
| Server Actions | `lib/actions/lp-faq-actions.ts` |
| 管理画面コンポーネント | `components/admin/LpFaqContent.tsx` |
| 公開表示 | `app/service/recruitment-marketing/page.tsx` |

---

## LP 企業ロゴ（lp_company_logos）

- **用途**: 法人LP の導入企業ロゴスクロールセクションに表示するロゴ画像。
- **ドラフト/審査**: 不要。admin が直接 CRUD する。
- **RLS**: `anon, authenticated` → SELECT のみ。`authenticated` + `role = 'admin'` → ALL。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| LP 企業ロゴ | `lp_company_logos` | 企業名・ロゴ画像URL・上段/下段・表示順を管理。 |

### テーブル定義

**lp_company_logos**

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| name | text NOT NULL | 企業名（alt属性にも使用） |
| image_url | text NOT NULL | ロゴ画像URL |
| row_position | text NOT NULL DEFAULT 'top' | CHECK ('top', 'bottom')。スクロールの上段/下段。 |
| display_order | integer NOT NULL DEFAULT 0 | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 参照実装（LP 企業ロゴ）

| 役割 | パス（jobtv） |
|------|----------------|
| Server Actions | `lib/actions/lp-company-logo-actions.ts` |
| 管理画面コンポーネント | `components/admin/LpCompanyLogosContent.tsx` |
| 公開表示 | `app/service/recruitment-marketing/page.tsx` |

---

## LP スクロールバナー（lp_scroll_banner）

- **用途**: 法人LP の右下に表示されるスクロール追従バナー。画像と遷移先リンクを管理。
- **ドラフト/審査**: 不要。admin が直接 CRUD する。
- **RLS**: `anon, authenticated` → SELECT のみ。`authenticated` + `role = 'admin'` → ALL。
- **運用**: `is_active = true` のバナーのうち最新の1件が表示される。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| LP スクロールバナー | `lp_scroll_banner` | 画像URL・遷移先URL・有効/無効を管理。 |

### テーブル定義

**lp_scroll_banner**

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid PK | |
| image_url | text NOT NULL | バナー画像URL |
| link_url | text NOT NULL | クリック時の遷移先URL |
| is_active | boolean NOT NULL DEFAULT true | 有効/無効 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 参照実装（LP スクロールバナー）

| 役割 | パス（jobtv） |
|------|----------------|
| Server Actions | `lib/actions/lp-scroll-banner-actions.ts` |
| 管理画面コンポーネント | `components/admin/LpScrollBannerContent.tsx` |
| 公開表示 | `app/service/recruitment-marketing/page.tsx` |

---

## 企業基本情報（companies）

- **本番**: `companies`。企業名・ロゴ・業界・従業員数など。`company_status`（active/closed）で公開制御。
- **ドラフト**: `companies_draft`。企業情報の審査用。admin/review の「企業情報」タブで承認・却下。企業ページ（company_pages）とは別タブ・別フロー。
- **企業サムネ（thumbnail_url）**: ロゴとは別の概念。トップページの企業カードに表示する画像。未設定時は `logo_url` を表示。`companies` と `companies_draft` の両方にあり、スタジオ「設定 > 企業プロフィール」で設定・審査申請後に本番反映。**管理者**は `/admin/company-accounts` から企業ごとにサムネを直接アップロード・更新できる（本番の `companies.thumbnail_url` を即時更新）。
- **admin 企業詳細ページ（`/admin/company-accounts/[companyId]`）**: 6タブ構成（企業情報・企業ページ・求人・説明会・動画・リクルーター）。admin が企業のすべてのコンテンツを審査バイパスで直接入稿できる。各タブの保存は `lib/actions/admin-company-detail-actions.ts` で処理し、ドラフト（`draft_status = "approved"`）と本番（`status = "active"`）の両方に同時書き込みする。
- 用語・振る舞いの詳細、参照実装一覧は、必要に応じてこの doc にセクションを追加する。DB 変更時は必ず該当箇所を更新する。

### 参照実装（企業基本情報・企業詳細ページ）

| 役割 | パス（jobtv） |
|------|----------------|
| admin 企業アカウント一覧 | `app/admin/(dashboard)/company-accounts/page.tsx` |
| admin 企業詳細ページ（タブシェル） | `app/admin/(dashboard)/company-accounts/[companyId]/page.tsx` |
| admin 企業情報タブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/CompanyInfoTab.tsx` |
| admin 企業ページタブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/CompanyPageTab.tsx` |
| admin 求人タブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/JobsTab.tsx` |
| admin 説明会タブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/SessionsTab.tsx` |
| admin 動画タブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/VideosTab.tsx` |
| admin リクルータータブ | `app/admin/(dashboard)/company-accounts/[companyId]/_components/RecruitersTab.tsx` |
| admin 企業詳細用 Server Actions | `lib/actions/admin-company-detail-actions.ts` |
| 企業アカウント CRUD | `lib/actions/company-account-actions.ts` |

---

## 通知（notifications）

- **テーブル**: `notifications`、`notification_reads` など。ユーザー向け通知の管理。
- 用語・振る舞いの詳細、参照実装一覧は、必要に応じてこの doc にセクションを追加する。DB 変更時は必ず該当箇所を更新する。

---

## 求職者（candidates）と会員登録

求職者（candidate ロール）の実データは `candidates` テーブルに格納する。認証ユーザーと候補者行の対応は `profiles.candidate_id` で管理する。

### 用語とデータの対応

| 用語 | テーブル・カラム | 説明 |
|------|------------------|------|
| 求職者プロフィール | `candidates` | 連絡先・学校・興味業界・職種など。1 ユーザー（auth.uid）に 1 行。**氏名は `profiles` に集約。** |
| 認証と候補者の紐付け | `profiles.candidate_id` | 求職者ロールのとき、そのユーザーに紐づく `candidates.id`。NULL の場合は未紐付け。 |
| 説明会予約の主体 | `session_reservations.candidate_id` | `candidates.id` を指す（auth.uid ではない）。 |

### テーブル定義（解釈上の要点）

**candidates**

- **名前（`last_name`, `first_name`, `last_name_kana`, `first_name_kana`）は candidates には持たず、`profiles` テーブルで一元管理する。** すべての候補者は auth ユーザー + profiles を持つ。全ロール（candidate, recruiter, admin）の名前は profiles に集約されている。
- **メールアドレスも candidates には持たず、`profiles.email` のみで管理する。**
- **`notes`（管理メモ）と `assigned_to`（担当リクルーター）は `candidate_management` テーブルに分離している。** candidates には持たない。
- `desired_work_location`: 希望勤務地（都道府県など）。
- `faculty_name`, `department_name`: 学部・学科（別カラム）。`major_field` は文理区分（文系・理系・その他）。
- `desired_industry`, `desired_job_type`: 複数選択可。DB は **text[]**（他複数選択の benefits に合わせた形式）。
- `date_of_birth`: YYYY-MM-DD 形式（例: 2000-01-01）。
- `entry_channel`: 管理用。会員登録フォームでは扱わず null。
- `web_consultation`: 就活お悩みWEB相談（無料）の希望フラグ。会員登録時に設定。`event_reservations.web_consultation` とは別管理（会員情報としての希望）。
- `referrer`, `utm_*`: 流入元・UTM パラメータ。クライアントで取得して保存。
- `line_user_id`: LINE Login で取得した LINE の userId。**LINE 連携済みかどうかは `candidates.line_user_id IS NOT NULL` で判定する。** 1 つの LINE アカウントは 1 候補者にのみ紐づく（UNIQUE）。学生が設定画面で連携・解除を行う。

**candidate_management**

候補者の「採用管理データ」を candidates から分離したテーブル。書き込みオーナーは agent-manager のみ。

- `candidate_id`: `candidates.id` に 1:1 で紐づく（UNIQUE 制約）。ON DELETE CASCADE。
- `notes`: 管理メモ（任意）。
- `assigned_to`: 担当リクルーター（`profiles.id` への FK）。ON DELETE SET NULL。
- **RLS**: admin / recruiter ロールは全操作可。candidate は自分のレコードのみ SELECT 可。
- **利用アプリ**: agent-manager（編集・表示）、jobtv（assigned_to を参照のみ）。

**profiles**

- `last_name`, `first_name`, `last_name_kana`, `first_name_kana`: **全ロール（candidate, recruiter, admin）の名前を profiles で一元管理する。** candidates テーブルには名前カラムを持たない。
- `email`: 認証・連絡用メール。**求職者のメールは profiles にのみ保持し、candidates には持たない。**
- `candidate_id`: 求職者ロールのとき、本人の `candidates.id`。会員登録完了時に RPC で設定。**UNIQUE 制約あり（1:1 リレーション）。**

### Admin による学生アカウント作成フロー

管理者は `/admin/student-accounts` から学生アカウントを個別作成または CSV 一括登録できる。

1. Admin がフォームに入力（メール + 姓名 + カナ）、または CSV をアップロード
2. `createStudent()` Server Action 呼び出し
3. `supabase.auth.admin.generateLink({ type: "invite" })` で招待リンク生成
4. `sendTemplatedEmail("invite_student")` でメール送信
5. profiles 待機 → upsert（role=candidate）
6. candidates INSERT → profiles.candidate_id 更新

### 会員登録フロー

1. ユーザーが `/auth/signup` でフォーム送信（全項目必須。referrer・utm はクライアントで取得して hidden で送信）。
2. Server Action で `supabase.auth.signUp(email, password)` を実行。成功時、`handle_new_user` により `profiles` に 1 行 INSERT（`role = 'candidate'`）。
3. 同一リクエスト内で、認証済みセッションを使って RPC `create_candidate_and_link_profile(payload)` を呼ぶ。RPC は **SECURITY DEFINER** で、`auth.uid()` を検証したうえで `candidates` に 1 行 INSERT し、`profiles.candidate_id` を UPDATE（1 トランザクション）。会員登録直後の RLS 通過を確実にするため関数側で権限を昇格している。
4. `session_reservations` の候補者用 RLS は「`profiles.candidate_id = session_reservations.candidate_id` かつ `profiles.id = auth.uid()`」で自分の予約のみ参照・更新可能。

### 参照実装（会員登録・求職者・学生アカウント管理）

| 役割 | パス（jobtv） |
|------|----------------|
| admin 学生アカウント一覧 | `app/admin/(dashboard)/student-accounts/page.tsx` |
| 学生アカウント CRUD | `lib/actions/student-account-actions.ts` |
| 学生 CSV 一括登録 | `lib/actions/student-csv-import.ts` |
| 会員登録フォーム | `app/auth/signup/page.tsx` |
| 会員登録 Server Action・payload 組み立て | `lib/actions/auth-actions.ts`（signUp, buildCandidatePayloadFromFormData） |
| 会員登録用定数（性別・学校区分・業界・職種・文理・卒業年・生年月日など） | `constants/signup-options.ts` |
| RPC（candidates 作成＋profiles.candidate_id 紐付け） | DB: `create_candidate_and_link_profile(jsonb)` |
| LINE 連携（状態取得・解除） | `lib/actions/line-actions.ts`（getLineLinkStatus, unlinkLineAccount） |
| LINE 連携（マイページに統合） | `app/(main)/mypage/page.tsx`, `components/mypage/MypageTopView.tsx` |
| LINE 配信（Admin セグメント・送信） | `lib/actions/line-broadcast-actions.ts`、`app/admin/line/broadcast/page.tsx` |

---

## 求人エントリー・説明会予約（学生ログイン時）

学生（candidate）がログインしている場合、求人へのエントリー（`applications` 登録）と説明会の参加予約（`session_reservations` 登録）を公開ページのモーダル内で完了できる。未ログイン時はログイン・会員登録を促し、企業担当者・管理者は一覧表示のみでエントリー/予約は不可。

### 用語とデータの対応

| 用語 | テーブル・役割 |
|------|----------------|
| 求人への応募 | `applications`。candidate_id（candidates.id）と job_posting_id で 1 件登録。UNIQUE(candidate_id, job_posting_id) で重複防止。 |
| 説明会の参加予約 | `session_reservations`。session_date_id と candidate_id で 1 件登録。ログイン学生は `profiles.candidate_id` で予約する。 |

### 参照実装

| 役割 | パス（jobtv） |
|------|----------------|
| エントリー・予約モーダル（求人選択/日程選択・送信） | `components/company/CompanyEntryModal.tsx` |
| 求人エントリー Server Action | `lib/actions/application-actions.ts`（createApplicationsForCandidate） |
| 説明会予約 Server Action（ログイン学生用） | `lib/actions/session-reservation-actions.ts`（createSessionReservationForLoggedInCandidate） |

---

## 選考進捗履歴（application_progress）

`application_progress` は**1件の応募（applications）に対する選考ステータス変更の履歴**を格納するテーブルである。

- **applications**: 求人への「1件の応募」を表す。`current_status` で現在の選考ステータスを保持。
- **application_progress**: その応募のステータス変更履歴。1行が1回の変更（書類選考・一次面接・オファー等）。`application_id` で `applications.id` に紐づく。`status`, `status_date`, `notes`, `created_by` などを保持。
- **利用箇所**: agent-manager の選考進捗編集・応募詳細で使用。jobtv では参照しない。

---

## イベントシステム（event-system）用テーブル

event-system アプリで利用するデータは、テーブル名に **`event_` プレフィックス**を付与する方針とする。jobtv の `sessions`（説明会）と区別し、どのテーブルがイベント運営用か一目で分かるようにする。

### テーブル一覧（event_ プレフィックス付き）

| テーブル名 | 説明 |
|------------|------|
| `events` | イベント本体（コアエンティティのためプレフィックスなし）。詳細は下記テーブル定義を参照 |
| `event_reservations` | イベント予約・出席。`web_consultation`（WEB相談希望）、`last_reminder_sent_at`（リマインド送信管理） |
| `event_companies` | イベント参加企業 |
| `event_special_interviews` | イベント特別面接 |
| `event_matching_sessions` | マッチング枠（旧: `matching_sessions`） |
| `event_ratings_recruiter_to_candidate` | 企業 → 学生評価（旧: `ratings_recruiter_to_candidate`） |
| `event_ratings_candidate_to_company` | 学生 → 企業評価（旧: `ratings_candidate_to_company`） |

- `matching_results` は `event_matching_sessions` を参照するが、テーブル名は現状のまま（event_ 付与は未実施）。
- 詳細なカラム・RLS・参照実装は [event-specification.md](event-specification.md) を参照。**DB や役割を変更した際は、この doc と event-specification の両方を更新する。**

### RLS ポリシー（イベント系共通）

| 操作 | 許可ロール | 備考 |
|------|-----------|------|
| SELECT | authenticated 全員 | recruiter ダッシュボード・candidate 画面で必要 |
| INSERT / UPDATE / DELETE | admin, recruiter のみ | `profiles.role` で判定。event-system は `getAdminClient()` を使用するため RLS バイパス |

対象テーブル: `events`, `event_companies`, `event_matching_sessions`, `event_ratings_candidate_to_company`, `event_ratings_recruiter_to_candidate`, `event_reservations`, `event_special_interviews`, `matching_results`, `event_types`, `event_areas`, `event_graduation_years`

### RLS ポリシー（電話・CA面談・コメントテンプレート）

`phone_calls`, `phone_call_lists`, `phone_call_list_items`, `ca_interviews`, `comment_templates` は SELECT / 書き込みともに admin / recruiter のみ許可。

### Storage ポリシー（company-assets バケット）

| 操作 | 許可条件 |
|------|---------|
| SELECT（公開読み取り） | 全員（public バケット） |
| INSERT / UPDATE / DELETE | admin: 全パス可。recruiter: `companies/{自社company_id}/` 配下のみ |

### テーブル定義（解釈上の要点）

**events**

- `id` (UUID, PK)
- `event_type_id` (UUID, FK → `event_types`): イベント種別。`event_types.name`（イベント名）・`event_types.area`（エリア）・`event_types.target_graduation_year`（対象卒業年度）を参照する
- `event_date` (DATE): 開催日
- `start_time`, `end_time` (TIME): 開始・終了時刻
- `gathering_time` (TIME, NULL): 集合時間
- `venue_name` (TEXT, NULL): 会場名
- `venue_address` (TEXT, NULL): 会場住所
- `google_maps_url` (TEXT, NULL): GoogleマップURL
- `display_name` (TEXT, NULL): フロント表示用イベント名（NULL → `event_types.name`）
- `form_label` (TEXT, NULL): フォーム表示用ラベル（NULL → `event_types.name`）
- `form_area` (TEXT, NULL): フォーム表示用エリア（NULL → `event_types.area`）
- `target_attendance` (INT, NULL): 集客目標数（admin管理用、定員制限なし）
- `status` (TEXT, NOT NULL, DEFAULT `'active'`): `active` / `paused` / `cancelled`
- `deleted_at` (TIMESTAMPTZ, NULL): 論理削除日時。NULL でない場合は削除済み（一覧・公開ページから除外される）
- `created_by` (UUID, NULL): 作成者
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### ステータス動作ルール

| status | フォーム表示 | マイページ | リマインド送信 | 新規予約 |
|--------|-------------|-----------|---------------|---------|
| `active` | 表示 | 通常表示 | 送信する | 可 |
| `paused` | 非表示 | 通常表示 | 送信する | 不可 |
| `cancelled` | 非表示 | 中止バッジ表示 | 送信しない | 不可 |

#### 表示名フォールバック

- `display_name` → NULL なら `event_types.name`（メール・カレンダー・マイページ・thanks）
- `form_label` → NULL なら `event_types.name`（予約フォームのバッジ）
- `form_area` → NULL なら `event_types.area`（予約フォームのエリア表示）

---

## メールテンプレート（email_templates）

`email_templates` テーブルで SendGrid 送信内容を管理する。`sendTemplatedEmail()` 関数（`lib/email/send-templated-email.ts`）が DB からテンプレートを取得してレンダリング・送信・ログ記録を行う。

### 登録済みテンプレート一覧

| name | 用途 | 宛先 |
|------|------|------|
| `invite_recruiter` | 管理者がリクルーターアカウント作成時に送る初期パスワード設定メール | 新規リクルーター |
| `invite_student` | 管理者が学生アカウント作成時に送る初期パスワード設定メール | 新規学生 |
| `invite_team_member` | リクルーターがスタジオからチームメンバーを招待するメール | 招待対象者 |
| `candidate_welcome` | 会員登録完了メール（登録直後およびイベント予約時の既存候補者向け） | 候補者 |
| `signup_confirmation` | 候補者サインアップ確認メール（Supabase Auth Hook 経由） | 候補者 |
| `password_reset` | パスワードリセットリンクのメール（Supabase Auth Hook 経由） | 対象ユーザー |
| `job_application_notification` | 候補者が求人エントリーした際の通知 | 企業リクルーター全員 |
| `job_application_confirmation` | 求人エントリー受付確認メール | エントリーした候補者 |
| `session_reservation_notification` | 候補者が説明会を予約した際の通知 | 企業リクルーター全員 |
| `session_reservation_confirmation` | 説明会予約受付確認メール | 予約した候補者 |
| `event_reservation_confirmation` | イベント予約完了メール | 予約した候補者 |
| `event_reservation_reminder_7d` | イベント7日前リマインド | 予約した候補者 |
| `event_reservation_reminder_3d` | イベント3日前リマインド | 予約した候補者 |
| `event_reservation_reminder_1d` | イベント前日リマインド | 予約した候補者 |

### エントリー・予約通知の仕組み

- `createApplicationsForCandidate()` 成功後、`created.length > 0` の場合のみ `sendJobApplicationNotification()`（採用担当向け）と `sendJobApplicationConfirmation()`（学生向け）を fire-and-forget で呼ぶ。
- `createSessionReservationForLoggedInCandidate()` 成功後、`sendSessionReservationNotification()`（採用担当向け）と `sendSessionReservationConfirmation()`（学生向け）を fire-and-forget で呼ぶ。
- `fireReservationNotifications()`（イベント予約）で `sendEventReservationRecruiterNotification()` を fire-and-forget で呼び、`event_companies` 経由で該当企業のリクルーター全員に通知する。
- 通知ヘルパーは `lib/email/send-entry-notification.ts`（求人・説明会）と `lib/email/send-event-reservation-notification.ts`（イベント）に実装。
- メール送信エラーはエントリー・予約処理の失敗とは切り離す（`catch` + `logger.error` のみ）。

---

## 学校マスタ（school_master）

候補者の会員登録・プロフィール編集時の学校名・学部・学科サジェスト表示に使用する。区分（group_name）は管理者の分析用として保持する。

### 用語とデータの対応

| 用語 | テーブル・カラム | 説明 |
|------|------------------|------|
| 学校マスタ | `school_master` | 学校・学部・学科を非正規化で格納した統合マスタ（約1万行）。 |
| 学校グループ | `school_master.group_name` | 旧帝大・早慶 / MARCH・関関同立 等。管理者分析用。NULL可。 |
| 候補者との紐付け | `candidates.school_kcode` | 候補者が選択した学校の kcode。`school_master.school_kcode` に対応。管理者が group_name でグループ別分析可能。 |

### テーブル定義（解釈上の要点）

**school_master**

- `school_kcode`: 学校の識別子（CSVの kcode）。1校につき複数行（学部×学科の組み合わせ分）存在する。
- `faculty_name`: 学部名。学部情報がない学校は NULL。
- `department_name`: 学科名。学科情報がない学部は NULL。
- **RLS**: anon・authenticated ともに SELECT 可能。INSERT/UPDATE/DELETE は import スクリプト（service role）のみ。
- **インデックス**: `pg_trgm` を使った GIN インデックスで部分一致検索を高速化。

### データ投入

```bash
# CSV から school_master に投入（冪等: 既存データを削除してから再投入）
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm tsx scripts/import-school-data.ts
```

入力ファイルは `school/` ディレクトリの `school.csv`, `school_group.csv`, `school_department.csv`, `school_major.csv`。

### 参照実装（学校マスタ）

| 役割 | パス |
|------|------|
| データ投入スクリプト | `scripts/import-school-data.ts` |
| 検索 Server Action | `apps/jobtv/lib/actions/school-actions.ts`（searchSchoolNames, searchFacultyNames, searchDepartmentNames） |
| 汎用サジェスト UI | `apps/jobtv/components/common/SuggestInput.tsx` |
| プロフィール編集での使用 | `apps/jobtv/components/mypage/ProfileEditForm.tsx` |
| 会員登録での使用 | `apps/jobtv/app/auth/signup/page.tsx` |

---

## その他のドメイン

上記以外のテーブル（例: `profiles`、`applications` など）についても、役割や解釈を明文化する必要が生じた場合は、この doc にセクションを追加する。**DB や役割を変更した際は、必ず該当セクションを更新する。**

---

## 監査ログ（audit_logs）

管理者・システムの操作履歴を記録するテーブル。

### テーブル定義

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid (PK) | 自動生成 |
| created_at | timestamptz | 記録日時 |
| user_id | uuid (FK → auth.users) | 操作者 |
| action | text | 操作種別（`job.approve`, `proxy_login.start_company` 等） |
| category | text | カテゴリ（`content_review`, `account`, `content_edit`, `access`, `matching`, `hero`, `auth`, `storage`, `line`, `notification`, `email_template`） |
| resource_type | text | 対象テーブル名 |
| resource_id | text | 対象レコード ID |
| app | text | アプリ名（`jobtv`, `event-system`, `agent-manager`） |
| metadata | jsonb | 操作の詳細情報 |
| ip_address | text | リクエスト元 IP |

### RLS

- SELECT: admin ロールのみ
- INSERT: service_role（admin client）のみ

### 参照実装

| 役割 | パス |
|------|------|
| ヘルパー関数 | `packages/shared/utils/audit.ts`（`logAudit()`） |
| マイグレーション | `supabase/migrations/20260313000000_create_audit_logs.sql` |

---

## LINE 配信ログ・テンプレート

LINE 一斉配信の実行記録・候補者別配信結果・テンプレート管理・管理者テスト送信用のテーブル群。

### line_broadcast_logs

配信履歴テーブル。LINE 一斉配信の実行記録を 1 配信 1 行で保持する。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid PK | |
| status | text | draft / scheduled / sending / sent / failed / cancelled |
| filters_snapshot | jsonb | 配信時のフィルター条件 |
| messages_snapshot | jsonb | 配信メッセージ（LineMessage[]） |
| target_count | int | 配信対象数 |
| sent_count / failed_count / blocked_count | int | 結果カウント |
| scheduled_at | timestamptz | 予約配信日時（即時は NULL） |
| sent_at | timestamptz | 実行完了日時 |
| created_by | uuid FK→auth.users | 実行した管理者 |
| template_id | uuid FK→line_message_templates | 使用テンプレート（NULL 可） |

- RLS: admin のみ全操作
- インデックス: status, created_at DESC, scheduled_at WHERE status='scheduled'

### line_broadcast_deliveries

候補者別配信結果テーブル。各 LINE push の送信結果を 1 行で記録。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid PK | |
| broadcast_log_id | uuid FK→line_broadcast_logs | 親ログ |
| candidate_id | uuid FK | 候補者 |
| line_user_id | text | 送信先 |
| status | text | pending / success / failed / blocked |
| error_code / error_message | text | エラー詳細 |
| retry_count | int | リトライ回数（最大 3） |
| last_attempted_at | timestamptz | 最終試行日時 |

- RLS: admin SELECT のみ（INSERT/UPDATE は service_role）
- インデックス: broadcast_log_id, status, (broadcast_log_id, status) WHERE status='failed' AND retry_count<3

### line_message_templates

LINE メッセージテンプレートテーブル。配信で再利用可能なメッセージ構成を保存。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid PK | |
| name | text UNIQUE | テンプレート名 |
| description | text | 説明 |
| message_type | text | text / bubble / carousel / image / imagemap |
| messages_json | jsonb | LineMessage[]（API 送信用） |
| builder_state_json | jsonb | ビルダー UI 状態（フォーム復元用） |
| is_active | boolean | ソフトデリート用 |
| created_by | uuid FK | |

- RLS: admin のみ全操作

### admin_line_user_ids

管理者の LINE userId テーブル。テスト送信で使用。

| カラム | 型 | 説明 |
|--------|-----|------|
| profile_id | uuid PK FK→auth.users | |
| line_user_id | text NOT NULL | 管理者の LINE userId |

- RLS: admin のみ全操作

---

## ストレージ管理

### storage_deletion_queue

ストレージ（S3 / Supabase Storage）の削除候補をキューとして蓄積するテーブル。動画・画像の削除/更新操作時に自動登録され、管理者が承認後に実際の削除が実行される。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid PK | |
| storage_type | text NOT NULL | `'s3'` または `'supabase'` |
| bucket | text NOT NULL | バケット名 |
| path | text NOT NULL | S3 key または Supabase Storage パス |
| is_prefix | boolean NOT NULL | true = プレフィックス配下一括削除 |
| source | text NOT NULL | 発生源（例: `delete_video`, `update_hero_thumbnail`, `full_scan`） |
| source_detail | text | 補足情報（レコード ID 等） |
| status | text NOT NULL | `pending` → `approved` → `completed` / `failed` |
| created_at | timestamptz | |
| approved_at | timestamptz | |
| executed_at | timestamptz | |
| error_message | text | 実行失敗時のエラー |

- RLS: service_role のみ（Server Action 経由）
- 参照実装: `lib/storage/deletion-queue.ts`, `lib/actions/storage-cleanup-actions.ts`, 各 action ファイルの削除/更新関数

### storage_cleanup_schedules

フルスキャン（ストレージ全体と DB 参照の突合）の日時予約テーブル。Cron が毎日チェックし、実行時刻を過ぎた予約を処理する。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | uuid PK | |
| scan_from | timestamptz NOT NULL | スキャン対象期間（開始） |
| scan_to | timestamptz NOT NULL | スキャン対象期間（終了） |
| scheduled_at | timestamptz NOT NULL | 実行予定日時 |
| status | text NOT NULL | `pending` → `running` → `completed` / `failed` |
| created_at | timestamptz | |
| result | jsonb | 結果サマリ（孤立ファイル数等） |

- RLS: service_role のみ（Server Action 経由）
- 参照実装: `lib/actions/storage-cleanup-actions.ts`, `app/api/cron/storage-cleanup/route.ts`
