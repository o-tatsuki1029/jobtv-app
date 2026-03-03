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

JobTV では、スタジオで編集し管理者審査を経てから公開する機能について、次のパターンでテーブルが分かれている。

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

**未認証では取得できないもの（認証必須・スタジオ/管理画面用）**

- `session_reservations` の行（誰が予約したか）。件数だけは上記 RPC で取得可能。
- 求人への応募内容（`job_applications` / `applications` 等）。
- ドラフト系テーブル（`*_draft`）。プロフィール（`profiles`）の他ユーザー分。

---

## 企業ページ

スタジオの企業ページ管理（`/studio/company`）、公開の企業ページ（`/company/[id]`）、管理者審査（`/admin/review` の企業ページタブ）で扱うデータの解釈。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| 企業基本情報 | `companies` | 企業名・ロゴ・業界・従業員数など。企業情報の審査は `companies_draft`。企業ページとは別機能。 |
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
- **特例**: `id === 'uid'` のときはモックデータを表示（開発/デモ用）。本番では無効化または環境変数制御を推奨。

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

---

## 求人（job_postings）

- **本番**: `job_postings`。公開サイトの求人一覧・詳細に表示。`status`（例: `job_status` の active/closed）で公開制御。
- **ドラフト**: `job_postings_draft`。スタジオで編集し、審査承認後に本番へ反映する想定。`draft_status` でライフサイクル管理。
- 用語・振る舞いの詳細、参照実装一覧は、必要に応じてこの doc にセクションを追加する。DB 変更時は必ず該当箇所を更新する。

---

## 説明会（sessions）

- **本番**: `sessions`。公開サイトの説明会一覧・詳細。`session_dates`、`session_reservations` など関連テーブルあり。`session_status`（active/closed）で公開制御。
- **ドラフト**: `sessions_draft`。スタジオで編集し、審査承認後に本番へ反映する想定。
- **日付ドラフト**: `session_dates_draft` など、説明会日付のドラフト管理がある場合もここに解釈をまとめる。
- 用語・振る舞いの詳細、参照実装一覧は、必要に応じてこの doc にセクションを追加する。DB 変更時は必ず該当箇所を更新する。

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

---

## トップ掲載コンテンツ（就活Shorts・就活ドキュメンタリー）

トップページの「就活Shorts」「就活ドキュメンタリー」に**どの企業のどの動画を表示するか**を、admin が選択・並び替えするだけの機能。入稿ではなく既存の `videos` を参照する。審査フローはない。

### 用語とデータの対応

| 用語 | テーブル | 説明 |
|------|----------|------|
| トップに表示する動画の選択 | `top_page_featured_videos` | トップに表示する動画を `videos.id`（video_id）で参照。`kind` で就活Shorts / 就活ドキュメンタリーのどちらに表示するかを区別。`display_order` で表示順。 |

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

## 企業基本情報（companies）

- **本番**: `companies`。企業名・ロゴ・業界・従業員数など。`company_status`（active/closed）で公開制御。
- **ドラフト**: `companies_draft`。企業情報の審査用。admin/review の「企業情報」タブで承認・却下。企業ページ（company_pages）とは別タブ・別フロー。
- **企業サムネ（thumbnail_url）**: ロゴとは別の概念。トップページの企業カードに表示する画像。未設定時は `logo_url` を表示。`companies` と `companies_draft` の両方にあり、スタジオ「設定 > 企業プロフィール」で設定・審査申請後に本番反映。**管理者**は `/admin/company-accounts` から企業ごとにサムネを直接アップロード・更新できる（本番の `companies.thumbnail_url` を即時更新）。
- 用語・振る舞いの詳細、参照実装一覧は、必要に応じてこの doc にセクションを追加する。DB 変更時は必ず該当箇所を更新する。

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
| 求職者プロフィール | `candidates` | 氏名・連絡先・学校・興味業界・職種など。1 ユーザー（auth.uid）に 1 行。 |
| 認証と候補者の紐付け | `profiles.candidate_id` | 求職者ロールのとき、そのユーザーに紐づく `candidates.id`。NULL の場合は未紐付け。 |
| 説明会予約の主体 | `session_reservations.candidate_id` | `candidates.id` を指す（auth.uid ではない）。 |

### テーブル定義（解釈上の要点）

**candidates**

- `last_name`, `first_name`, `last_name_kana`, `first_name_kana`: 必須。**メールアドレスは candidates には持たず、profiles.email のみで管理する。**
- `desired_work_location`: 希望勤務地（都道府県など）。
- `faculty_name`, `department_name`: 学部・学科（別カラム）。`major_field` は文理区分（文系・理系・その他）。
- `desired_industry`, `desired_job_type`: 複数選択可。DB は **text[]**（他複数選択の benefits に合わせた形式）。
- `date_of_birth`: YYYY-MM-DD 形式（例: 2000-01-01）。
- `entry_channel`: 管理用。会員登録フォームでは扱わず null。
- `referrer`, `utm_*`: 流入元・UTM パラメータ。クライアントで取得して保存。
- `line_user_id`: LINE Login で取得した LINE の userId。**LINE 連携済みかどうかは `candidates.line_user_id IS NOT NULL` で判定する。** 1 つの LINE アカウントは 1 候補者にのみ紐づく（UNIQUE）。学生が設定画面で連携・解除を行う。

**profiles**

- `email`: 認証・連絡用メール。**求職者のメールは profiles にのみ保持し、candidates には持たない。**
- `candidate_id`: 求職者ロールのとき、本人の `candidates.id`。会員登録完了時に RPC で設定。

### 会員登録フロー

1. ユーザーが `/auth/signup` でフォーム送信（全項目必須。referrer・utm はクライアントで取得して hidden で送信）。
2. Server Action で `supabase.auth.signUp(email, password)` を実行。成功時、`handle_new_user` により `profiles` に 1 行 INSERT（`role = 'candidate'`）。
3. 同一リクエスト内で、認証済みセッションを使って RPC `create_candidate_and_link_profile(payload)` を呼ぶ。RPC は **SECURITY DEFINER** で、`auth.uid()` を検証したうえで `candidates` に 1 行 INSERT し、`profiles.candidate_id` を UPDATE（1 トランザクション）。会員登録直後の RLS 通過を確実にするため関数側で権限を昇格している。
4. `session_reservations` の候補者用 RLS は「`profiles.candidate_id = session_reservations.candidate_id` かつ `profiles.id = auth.uid()`」で自分の予約のみ参照・更新可能。

### 参照実装（会員登録・求職者）

| 役割 | パス（jobtv） |
|------|----------------|
| 会員登録フォーム | `app/auth/signup/page.tsx` |
| 会員登録 Server Action・payload 組み立て | `lib/actions/auth-actions.ts`（signUp, buildCandidatePayloadFromFormData） |
| 会員登録用定数（性別・学校区分・業界・職種・文理・卒業年・生年月日など） | `constants/signup-options.ts` |
| RPC（candidates 作成＋profiles.candidate_id 紐付け） | DB: `create_candidate_and_link_profile(jsonb)` |
| LINE 連携（状態取得・解除） | `lib/actions/line-actions.ts`（getLineLinkStatus, unlinkLineAccount） |
| LINE 連携画面（学生向け） | `app/(main)/settings/line/page.tsx` |
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
| `events` | イベント本体（コアエンティティのためプレフィックスなし） |
| `event_reservations` | イベント予約・出席 |
| `event_companies` | イベント参加企業 |
| `event_special_interviews` | イベント特別面接 |
| `event_matching_sessions` | マッチング枠（旧: `matching_sessions`） |
| `event_ratings_recruiter_to_candidate` | 企業 → 学生評価（旧: `ratings_recruiter_to_candidate`） |
| `event_ratings_candidate_to_company` | 学生 → 企業評価（旧: `ratings_candidate_to_company`） |

- `matching_results` は `event_matching_sessions` を参照するが、テーブル名は現状のまま（event_ 付与は未実施）。
- 詳細なカラム・RLS・参照実装は [event-specification.md](event-specification.md) を参照。**DB や役割を変更した際は、この doc と event-specification の両方を更新する。**

---

## その他のドメイン

上記以外のテーブル（例: `profiles`、`applications` など）についても、役割や解釈を明文化する必要が生じた場合は、この doc にセクションを追加する。**DB や役割を変更した際は、必ず該当セクションを更新する。**
