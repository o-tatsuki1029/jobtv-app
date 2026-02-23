# ロール・認証・データアクセス

このドキュメントは、サービスの 3 ロール（admin / recruiter / candidate）、データ分離、認証・ロール取得、ルート保護の公式な仕様と参照実装をまとめた開発者向けの正本です。テーブル・用語の解釈は [database-domain.md](database-domain.md) を参照する。

---

## サービスの 3 ロール

このサービスには **運営会社・掲載企業・求職者** の 3 種類の利用者がおり、扱うデータを厳格に分ける必要がある。ロールは `profiles.role`（DB は `user_role` enum）で管理する。

| ロール (profiles.role) | 役割 | 説明 |
|------------------------|------|------|
| **admin** | 運営会社 | サービス運営側。審査・マスタ管理・全社データの参照・管理が可能。 |
| **recruiter** | 掲載企業 | 求人・企業ページ・説明会などを掲載する企業の担当者。自社データのみ操作可能。 |
| **candidate** | 求職者ユーザー | 求職者。自分のプロフィール・予約・応募など自分に紐づくデータのみ操作可能。 |

- 実装・DB では **admin / recruiter / candidate** の 3 値で統一する。
- 表示用ラベルは `packages/shared/auth/types.ts` の `ROLE_LABELS` に合わせる（管理者 / 企業担当者 / 学生）。

## データ分離の原則

- **運営・掲載企業・求職者のデータは厳格に分離する。**
- どのロールがどのテーブル／行を **参照・作成・更新・削除** できるかは、RLS と Server Actions（＋レイアウトの `requireXxx()`）で担保する。
- **admin**: 全社・全企業・全求職者に関わるデータにアクセス可能（審査・マスタ・プロフィール一覧など）。RLS で「admin は全件」としているテーブルが多い。
- **recruiter**: **自社（profiles.company_id）に紐づくデータのみ**。企業ページ・求人・説明会・自社の説明会予約一覧など。他社・求職者個人の他社向けデータは見せない。
- **candidate**: **自分（profiles.candidate_id → candidates.id）に紐づくデータのみ**。自分の予約・応募・プロフィール。他求職者や他社の内部データは見せない。

---

## admin（運営会社）の役割とルール

- **ルート保護**: `/admin` 配下は `requireAdmin()` で保護（`app/admin/(dashboard)/layout.tsx`）。
- **アクセス可能データ**: 全プロフィール、全企業・企業ドラフト、全求人・説明会・動画のドラフト/本番、求職者（candidates）一覧、応募（applications）、マスタ類。RLS は「`profiles.role = 'admin'` なら許可」のポリシーで実装。
- **禁止**: 他ロールの「自分用」データを意図的に混同しない（運用・実装とも admin 専用画面のみで操作）。

## recruiter（掲載企業）の役割とルール

- **ルート保護**: `/studio` 配下（`/studio/login` を除く）は `requireStudioAuth()` で保護（`app/studio/(dashboard)/layout.tsx`）。未認証時は `/studio/login` にリダイレクト。企業担当者ログインは `/studio/login`。
- **識別**: `profiles.company_id` で自社を特定。操作対象はすべて `company_id = profiles.company_id` に限定する。
- **アクセス可能データ**: 自社の企業ページドラフト・本番、自社の求人・説明会・動画・説明会の予約一覧（誰が予約したか）。candidates は「参照用」で他機能から参照する場合あり（現行 RLS: admin and recruiters can view all candidates）。応募などは仕様に応じて自社求人分のみに限定する。
- **禁止**: 他社の `company_id` のデータの変更・他社としての操作。求職者への直接の個人情報の横流し禁止。

## candidate（求職者）の役割とルール

- **ルート保護**: （今後実装） candidate 専用画面がある場合はレイアウトで `requireCandidate()` 等で保護。未実装の間はトップや公開ページへのリダイレクト（`getRedirectPathByRole('candidate')` → `/`）で十分。
- **識別**: `profiles.candidate_id` で自分に紐づく `candidates.id` を特定。求職者としての実データはすべて `candidates` テーブルに格納し、`session_reservations.candidate_id` はこの `candidates.id` を指す。
- **アクセス可能データ**: 自分に紐づく予約（`session_reservations` の `candidate_id = profiles.candidate_id`）、自分の candidate 行、自分の応募（将来）のみ。公開情報（企業一覧・求人・説明会一覧・満席数）は anon と同様に閲覧可能。
- **禁止**: 他求職者のデータ・企業のスタジオ用データ・管理画面用データへのアクセス。

## 新規登録の方針

- **求職者(candidate)**: 公開の会員登録（`/auth/signup`）でのみ新規作成可能。登録時は DB の `handle_new_user` により `role = 'candidate'` が設定され、続けて RPC `create_candidate_and_link_profile` で `candidates` を 1 件作成し `profiles.candidate_id` に紐付ける。
- **管理者(admin)・企業担当者(recruiter)**: 新規登録は **管理画面（admin）からの操作でのみ** 可能とする。公開の signUp では candidate しか作成されない。管理画面で profile を先に作成（または招待）し、そのメールで signUp されたときに既存の role が流用される。

---

## ロールの取得と利用

### 基本方針

- **ロール（profiles.role）は「ページ（レイアウト）の読み込み時」に取得した値を使う**
- ヘッダー表示・UI の出し分け・その他の画面処理は、すべてこの「読み込み時に確定したロール」に基づいて行う
- ログイン・ログアウト時は `onAuthStateChange` 等で再取得し、それ以降の表示・処理はその最新値を使う

### ルール

- レイアウト（またはルート）で一度だけロール（＋必要ならリクルーター用メニュー情報）を取得し、Context 等で配る
- 各ページ・コンポーネントでは、**その配られたロールを参照する**。画面表示のたびにクライアントや Server Action でロールを再取得しない
- ロールに依存する処理（表示の出し分け・リダイレクト・権限チェック）は、上記「読み込み時に取得したロール」を信頼して実装する
- キャッシュでロールを保持する場合は、**セッション（またはユーザー）ごと・短い TTL** に限定し、他ユーザーに漏れないようにする。現状はキャッシュせず「レイアウト実行時に毎回取得」でよい

---

## 認可・ルート保護

### ルール

- 認証・認可が必要なルートでは **レイアウト** で `requireXxx()`（例: `requireAdmin()`, `requireRecruiterOrAdmin()`）を await する。ページごとではなくレイアウトで一括してチェックする
- 未認証・権限不足の場合は `redirect()` し、リダイレクト先は **ロールに応じた共通ヘルパー**（`getRedirectPathByRole(role)` 等）で決める
- 新規に保護付きルートを増やすときも上記パターンに従う

---

## 参照実装（jobtv）

- **認証情報取得・配布**: `apps/jobtv/app/(main)/layout.tsx`（`getHeaderAuthInfo()` を await → `HeaderAuthProvider`）、`HeaderAuthContext`（`onAuthStateChange` で更新）、各 UI は `useHeaderAuth()` で参照
- **認可・ルート保護**: `apps/jobtv/lib/auth/require-auth.ts`（`requireAdmin()`, `requireRecruiterOrAdmin()`, `requireStudioAuth()`）、`apps/jobtv/lib/auth/redirect.ts`（`getRedirectPathByRole()`）
- **レイアウトでの使用**: `apps/jobtv/app/admin/(dashboard)/layout.tsx`（`requireAdmin()`）、`apps/jobtv/app/studio/layout.tsx`（`requireRecruiterOrAdmin()`）
- **RLS を触る場合**: `supabase/migrations/` の RLS 定義も参照する。ロール追加・RLS 変更時は [database-domain.md](database-domain.md) もあわせて更新する。
