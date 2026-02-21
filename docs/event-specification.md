# イベント運営システム 仕様書

## 1. システム概要

### 1.1 目的

企業と学生のマッチングイベントを管理・運営するための Web アプリケーションです。管理者、企業担当者、学生の 3 つのロールが存在し、それぞれの権限に応じた機能を提供します。

### 1.2 技術スタック

- **フレームワーク**: Next.js 15.5.6 (App Router)
- **言語**: TypeScript 5
- **UI**: React 19.1.0, Tailwind CSS 4.1.16
- **認証・データベース**: Supabase (PostgreSQL)
- **PDF 生成**: jsPDF
- **グラフ表示**: Recharts
- **デプロイ**: Vercel (推奨)

### 1.3 主要機能

1. **認証・認可システム**: ロールベースアクセス制御（RBAC）
   - 管理者・企業担当者: Supabase Auth（メール/パスワード）
     - 管理者ロール: `admin`（旧 `RA`, `CA`, `MRK` を統合）
     - 企業担当者ロール: `recruiter`
   - 学生: イベント、席番号、電話番号のみでログイン（クッキーベース認証）
2. **イベント管理**: イベントの作成、編集、削除
3. **学生管理**: 学生情報の登録、編集、CSV インポート/エクスポート
4. **企業管理**: 企業情報の登録、編集、CSV インポート
5. **企業担当者管理**: 企業担当者アカウントの作成、編集
6. **評価システム**:
   - 企業から学生への評価（S/A/B/C 4 段階評価）
     - 企業ベースの評価（1 企業 1 評価、担当者を跨いで共有）
     - 評価者名は自動反映（最後に更新した担当者名）
     - S 評価は 1 イベント 1 企業あたり 5 名まで制限
     - S・A 評価にはコメント必須
   - 学生から企業への評価（5 段階星評価、コメント 60 字以内）
7. **コメントテンプレート管理**: 企業単位の評価コメントテンプレート
8. **予約・出席管理**: イベントへの予約登録、出席登録、座席管理
9. **マッチングシステム**:
   - 企業と学生の相互評価に基づくマッチング
   - 特別面談の設定
   - 座談会のセッション管理
   - マッチング結果の CSV エクスポート
   - **スコアシート出力**: 学生ごとの評価スコアシートを PDF で出力（印刷用）
10. **学生からの評価閲覧**: 企業担当者が学生からの評価を閲覧・分析（グラフ表示）

## 2. アーキテクチャ

### 2.1 ディレクトリ構造

```
src/
├── app/                    # Next.js App Router ページ
│   ├── admin/             # 管理者専用ページ
│   │   ├── companies/     # 企業管理
│   │   ├── event/         # イベント管理
│   │   ├── candidates/    # 学生管理
│   │   ├── recruiters/    # 企業担当者管理
│   │   ├── users/         # 管理者アカウント管理
│   │   └── matching/      # マッチングシステム
    │   ├── recruiter/         # 企業担当者専用ページ
    │   │   ├── rating/        # 学生評価
    │   │   └── templates/     # コメントテンプレート管理
    │   ├── candidate/         # 学生専用ページ
    │   │   └── rating/        # 企業評価
    │   ├── login/             # ログイン・パスワードリセット
    │   └── signup/            # 新規登録
├── components/            # Reactコンポーネント
│   ├── layouts/          # レイアウトコンポーネント
│   └── ui/               # UIコンポーネント
├── hooks/                # カスタムフック
├── types/                # TypeScript型定義
├── utils/                # ユーティリティ関数
├── constants/            # 定数定義
└── middleware.ts         # Next.js ミドルウェア（認証・認可）
```

### 2.2 認証フロー

#### 管理者・企業担当者

1. ユーザーがログインページでメールアドレスとパスワードを入力
2. Supabase Auth で認証
3. ミドルウェアが`users`テーブルからロールを取得
4. ロールに応じて適切なページにリダイレクト
   - `admin` → `/admin`
   - `recruiter` → `/recruiter/rating`

#### 学生

1. 学生ログインページ（`/candidate/login`）でイベント、席番号、電話番号を入力
2. API ルート（`/api/candidate/verify`）で検証
3. 検証成功後、`candidate_id`と`candidate_event_id`を`httpOnly`クッキーに保存
4. 各ページでクッキーを確認し、学生ページへのアクセスを許可
5. `/candidate/rating`にリダイレクト

### 2.3 データフロー

- **クライアント側**: React Server Components + Client Components
- **サーバー側**: Server Actions（`src/app/actions/`）
- **データベース**: Supabase PostgreSQL（RLS 有効）
- **型安全性**: `src/types/database.types.ts`（自動生成）

## 3. データベーススキーマ

### 3.1 主要テーブル

#### `users` (認証・ロール管理)

- `id` (UUID, PK): `auth.users.id`を参照
- `email` (TEXT): メールアドレス
- `role` (TEXT): `admin`, `recruiter`のいずれか
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `companies` (企業)

- `id` (UUID, PK)
- `company_name` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `recruiters` (企業担当者)

- `id` (UUID, PK): `auth.users.id`を参照
- `company_id` (UUID, FK): `companies.id`を参照
- `email` (TEXT)
- `first_name`, `last_name` (TEXT)
- `first_name_kana`, `last_name_kana` (TEXT)
- `phone_number` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `candidates` (学生)

- `id` (UUID, PK): `auth.users.id`を参照
- `email` (TEXT)
- `first_name`, `last_name` (TEXT)
- `first_name_kana`, `last_name_kana` (TEXT)
- `phone_number` (TEXT)
- `gender` (TEXT)
- `graduation_year` (INTEGER)
- `school_name`, `school_type`, `major_field` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `events` (イベント)

- `id` (UUID, PK)
- `event_name` (TEXT)
- `event_area` (TEXT)
- `event_date` (DATE)
- `event_start_time`, `event_end_time` (TIME)
- `graduation_year` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `event_reservations` (予約・出席)

- `id` (UUID, PK)
- `event_id` (UUID, FK): `events.id`を参照
- `candidate_id` (UUID, FK): `candidates.id`を参照
- `seat_number` (TEXT, nullable): 座席番号（例: "A1", "B5"）
- `status` (TEXT): 予約ステータス
- `attended` (BOOLEAN): 出席フラグ
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `event_companies` (イベント参加企業)

- `id` (UUID, PK)
- `event_id` (UUID, FK): `events.id`を参照
- `company_id` (UUID, FK): `companies.id`を参照
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### `ratings_recruiter_to_candidate` (企業 → 学生評価)

- `id` (UUID, PK)
- `company_id` (UUID, FK): `companies.id`を参照（企業ベースの評価）
- `recruiter_id` (UUID, FK, nullable): `recruiters.id`を参照（企業全体評価の場合は NULL）
- `candidate_id` (UUID, FK): `candidates.id`を参照
- `event_id` (UUID, FK): `events.id`を参照
- `evaluator_name` (TEXT, nullable): 評価者名（最後に更新した担当者名が自動反映）
- `overall_rating` (INTEGER): 1-4（1=C, 2=B, 3=A, 4=S）
- `logic_rating`, `initiative_rating`, `cooperation_rating` (INTEGER): 詳細評価（1-4）
- `comment` (TEXT): コメント（60 字以内、S・A 評価では必須）
- `memo` (TEXT, nullable): 社内用メモ（1000 字以内）
- `created_at`, `updated_at` (TIMESTAMPTZ)
- UNIQUE 制約: `(company_id, candidate_id, event_id)` - 1 企業 1 学生 1 イベントあたり 1 評価

#### `ratings_candidate_to_company` (学生 → 企業評価)

- `id` (UUID, PK)
- `candidate_id` (UUID, FK): `candidates.id`を参照
- `company_id` (UUID, FK): `companies.id`を参照
- `event_id` (UUID, FK): `events.id`を参照
- `rating` (INTEGER): 1-5 の星評価
- `comment` (TEXT): コメント（60 字以内）
- `created_at`, `updated_at` (TIMESTAMPTZ)
- UNIQUE 制約: `(candidate_id, company_id, event_id)`

#### `comment_templates` (コメントテンプレート)

- `id` (UUID, PK)
- `company_id` (UUID, FK): `companies.id`を参照
- `template_text` (TEXT): テンプレート本文（60 字以内）
- `created_at`, `updated_at` (TIMESTAMPTZ)

### 3.2 Row Level Security (RLS)

すべてのテーブルで RLS が有効化されており、以下のポリシーが設定されています：

- **管理者 (`admin`)**: すべてのデータを読み書き可能
- **企業担当者 (`recruiter`)**: 自分の企業に関連するデータのみアクセス可能
- **学生 (`candidate`)**: 自分のデータと、自分が出席したイベントの関連データのみアクセス可能

### 3.3 データベースビュー

#### `candidates_without_auth`

- `auth.users`に登録されていない学生を取得するビュー
- 外部キー制約の参照先として使用
- カラム: `id`, `email`, `first_name`, `last_name`

#### `recruiters_without_auth`

- `auth.users`に登録されていない企業担当者を取得するビュー
- カラム: `id`, `email`, `first_name`, `last_name`, `company_id`

### 3.4 ヘルパー関数

- `is_candidate(user_id)`: ユーザーが学生か判定
- `get_user_company_id(user_id)`: 企業担当者の企業 ID を取得
- `check_candidate_attended_event(event_id, candidate_id)`: 学生がイベントに出席登録済みか判定

## 4. 認証・認可

### 4.1 ロール定義

- **管理者 (`admin`)**: システム全体の管理権限（旧 `RA`, `CA`, `MRK` を統合）
- **企業担当者 (`recruiter`)**: 自分の企業に関連する機能のみ利用可能
- **学生 (`candidate`)**: 自分の情報と評価機能のみ利用可能（アプリケーション内ロール）

### 4.2 アクセス制御

- **ミドルウェア** (`src/middleware.ts`): すべてのリクエストをインターセプトし、認証状態とロールを確認
- **ページレベル**: 各ページでロールに応じたデータフィルタリング
- **データベースレベル**: RLS ポリシーによる自動フィルタリング

### 4.3 パスワード管理

- 管理者がユーザーアカウントを作成する際、パスワードを自動生成または指定可能
- パスワードリセット機能: ログインページからメール送信、または管理者が直接リセット

## 5. 機能詳細

### 5.1 管理者機能

#### 5.1.1 イベント管理 (`/admin/event`)

- イベントの作成、編集、削除
- イベント一覧の表示（検索、ソート、ページネーション）
- フィルタリング（エリア、日付範囲、卒業年度、キーワード）

#### 5.1.2 学生管理 (`/admin/candidates`)

- 学生情報の登録、編集、削除
- CSV インポート/エクスポート
- 検索、ソート、ページネーション

#### 5.1.3 企業管理 (`/admin/companies`)

- 企業情報の登録、編集、削除
- CSV インポート
- 企業担当者管理へのリンク

#### 5.1.4 企業担当者管理 (`/admin/recruiters/[id]`)

- 企業担当者アカウントの作成、編集
- メールアドレスは編集不可（表示のみ）

#### 5.1.5 管理者アカウント管理 (`/admin/users`)

- 管理者アカウントの作成、削除
- パスワードリセット

#### 5.1.6 イベント予約・出席管理 (`/admin/event/reservation/[id]`)

- 学生の予約登録（複数選択可能）
- 出席登録（座席選択）
- 予約解除、出席解除

#### 5.1.7 イベント企業登録 (`/admin/event/company/[id]`)

- イベントへの企業参加登録

#### 5.1.8 マッチングシステム (`/admin/matching`)

- イベントを選択してマッチングを実行
- 座談会のセッション数を設定（参加企業数まで）
- 重み設定（企業評価: 0.7、学生評価: 0.3 で固定、変更不可）
- 評価状況の確認（企業評価・学生評価の完了数）
- 特別面談の設定（企業 × セッション数のマトリクス）
- マッチング結果の表示 (`/admin/matching/results/[sessionId]`)
  - セッションごとにグループ化
  - 席番号順にソート
  - 特別面談は赤背景で表示（`【特】`マーク付き）
  - セッション選択ドロップダウン（実行回数で表示）
  - CSV エクスポート機能
  - **スコアシート出力**: すべての学生の評価スコアシートを 1 つの PDF にまとめて出力
    - 学生ごとに 1 ページ
    - 各企業からの評価（総合、論理性、主体性、協調性、コメント、評価者名）を表示
    - イベント情報、学生情報（名前、フリガナ、席番号）を含む
    - 印刷して学生に渡すことを想定
    - ファイル名: `スコアシート_[イベント名]_全[N]名.pdf`

### 5.2 企業担当者機能

#### 5.2.1 学生評価 (`/recruiter/rating`)

- イベント選択ページ（`/recruiter/event-selection`）で選択したイベントの学生を評価
- そのイベントに出席登録済みの学生を評価
- 評価項目:
  - 総合評価: S/A/B/C（1 イベント 1 企業あたり S 評価は 5 名まで）
  - 詳細評価: 論理性、主体性、協調性（各 S/A/B/C）
  - コメント: 60 字以内（S・A 評価では必須）
- コメントテンプレートから選択可能
- 評価は企業ベース（1 企業 1 評価、担当者を跨いで共有）
- 評価者名は自動反映（最後に更新した担当者名）
- 他の担当者が評価した場合、上書き時に確認アラートを表示
- 総合評価ごとの件数表示（S/A/B/C の件数、S 評価の上限表示）

#### 5.2.2 学生からの評価閲覧 (`/recruiter/feedback`)

- イベント選択ページで選択したイベントの学生からの評価を閲覧
- 評価統計の表示（総件数、平均評価）
- 評価分布のグラフ表示（Recharts 使用）
- グラフのバーをクリックして評価でフィルタリング可能
- 席番号順にソートされた評価一覧表示

#### 5.2.3 コメントテンプレート管理 (`/recruiter/templates`)

- 自分の企業のコメントテンプレートを作成、編集、削除
- 管理者は企業選択ドロップダウンから任意の企業のテンプレートを管理可能

#### 5.2.4 イベント選択 (`/recruiter/event-selection`)

- 自分の企業が参加登録しているイベントを選択
- 選択したイベントはセッションストレージに保存
- 「学生評価」と「学生からの評価」ページで自動的に使用される

### 5.3 学生機能

#### 5.3.1 学生ログイン (`/candidate/login`)

- イベント、席番号、電話番号のみでログイン
- メールアドレス・パスワード不要
- ログイン後、選択したイベントの企業評価ページにリダイレクト
- サイドバー・ヘッダーなしのシンプルなレイアウト

#### 5.3.2 企業評価 (`/candidate/rating`)

- ログイン時に選択したイベントの企業を評価
- イベントは固定表示（変更不可）
- 学生名と席番号を表示
- そのイベントに参加登録している企業を評価
- 評価項目:
  - 星評価: 1-5 段階
  - コメント: 60 字以内（任意）
- サイドバーなしのレイアウト

## 6. UI/UX 仕様

### 6.1 レスポンシブデザイン

- **デスクトップ**: サイドバー常時表示、コンテンツエリア最大化
- **タブレット（iPad）**: `/recruiter`配下のページはタッチ操作を考慮した UI
  - 余白を最小化
  - ボタンサイズを大きく（最小高さ 40px）
  - テーブルセルを大きく（`px-4 py-3`, `text-sm`）
- **モバイル**: ハンバーガーメニュー（左下固定）、サイドバーはオーバーレイ表示

### 6.2 カラースキーム

- **評価バッジ**:
  - S: 赤 (`bg-red-500`)
  - A: 青 (`bg-blue-600`)
  - B: 薄い青 (`bg-blue-400`)
  - C: グレー (`bg-gray-400`)
- **ボタン**:
  - プライマリ: 青 (`bg-blue-500`)
  - セカンダリ: グレー (`bg-gray-200`)
  - 危険: 赤 (`bg-red-700`)
  - ライト: 薄いグレー (`bg-gray-100`)

### 6.3 コンポーネント

- **Table**: 再利用可能なテーブルコンポーネント（ソート、ページネーション対応）
- **Modal**: モーダルダイアログ（サイズ調整可能）
- **Button**: 統一されたボタンスタイル
- **FormField**: フォームフィールドのラッパー
- **Pagination**: ページネーション
- **PageSizeSelect**: ページサイズ選択

## 7. API 仕様

### 7.1 Server Actions

#### `src/app/actions/admin-users.ts`

- `createAdminUser(email, password?)`: 管理者アカウント作成
- `resetUserPassword(userId)`: パスワードリセット
- `deleteUser(userId)`: ユーザー削除

#### `src/app/actions/events.ts`

- イベント関連の Server Actions

### 7.2 API Routes

#### `/api/parse-csv`

- CSV ファイルのパース

#### `/api/convert-to-sjis`

- CSV ファイルの文字コード変換（Shift-JIS）

#### `/api/candidate/*` (学生ログイン用 API)

- `/api/candidate/verify`: 学生ログイン検証（イベント、席番号、電話番号）
- `/api/candidate/session`: セッション情報取得（クッキーから`candidate_id`と`candidate_event_id`を取得）
- `/api/candidate/info`: 学生情報取得（名前、席番号を含む）
- `/api/candidate/events`: イベント一覧取得
- `/api/candidate/seat-numbers`: 指定イベントの席番号一覧取得
- `/api/candidate/companies`: 指定イベントの企業一覧と評価取得
- `/api/candidate/ratings`: 学生評価の登録・更新

**注意**: これらの API ルートは`service_role`キーを使用して RLS をバイパスし、`httpOnly`クッキーを読み書きします。

## 8. セキュリティ

### 8.1 認証

- Supabase Auth による認証
- セッション管理は Supabase が自動処理

### 8.2 認可

- ミドルウェアによるページレベル認可
- RLS によるデータベースレベル認可
- クライアント側でも認可チェック（UX 向上のため）

### 8.3 データ保護

- パスワードはハッシュ化（Supabase が自動処理）
- 機密情報は環境変数で管理
- SQL インジェクション対策: Supabase クライアントによるパラメータ化クエリ
- 学生ログイン情報は`httpOnly`クッキーで保護
- `service_role`キーはサーバーサイドのみで使用（API ルート）

## 9. デプロイメント

### 9.1 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 9.2 ビルド

```bash
npm run build
```

### 9.3 デプロイ

- Vercel 推奨
- 環境変数を設定
- データベースマイグレーションを実行

## 10. 開発ガイドライン

### 10.1 コード規約

- TypeScript の型安全性を重視
- コンポーネントは可能な限り再利用可能に
- 類似のコンポーネントは統合を検討
- 機能追加時はコンポーネント化を優先

### 10.2 ファイル命名

- コンポーネント: PascalCase（例: `RatingModalForm.tsx`）
- ユーティリティ: camelCase（例: `auth.ts`）
- ページ: `page.tsx`（Next.js App Router 規約）
- クライアントコンポーネント: `page-client.tsx`

### 10.3 型定義

- データベース型: `src/types/database.types.ts`（自動生成）
- カスタム型: `src/types/`配下に配置
- `any`型の使用は最小限に

### 10.4 エラーハンドリング

- ユーザーフレンドリーなエラーメッセージ
- `src/utils/error-handling.ts`の`formatSupabaseError`を使用
- コンソールログでデバッグ情報を出力
- エラー状態の適切な表示
- エラーメッセージが画面外の場合は自動スクロール

### 10.5 共通ユーティリティ

- **API クライアント**: `src/utils/supabase/admin.ts` - Admin API 用クライアント
- **API レスポンス**: `src/utils/api/response.ts` - 統一された API レスポンス形式
- **セッションストレージ**: `src/hooks/useSessionStorage.ts` - セッションストレージ管理フック
- **データフェッチ**: `src/hooks/useDataFetch.ts` - 共通データフェッチフック

### 10.6 パフォーマンス最適化

- `useCallback`、`useMemo`を適切に使用
- `useEffect`の依存配列を最適化
- 不要な再レンダリングを防止
- 重複するデータフェッチを避ける（`useRef`でフラグ管理）

## 11. 実装済み機能

### 11.1 評価システム

- ✅ 企業から学生への評価（企業ベース、評価者名自動反映）
- ✅ 学生から企業への評価（5 段階星評価）
- ✅ 学生からの評価閲覧機能（`/recruiter/feedback`）
- ✅ 評価統計・グラフ表示
- ✅ S 評価の上限設定（5 名まで）
- ✅ S・A 評価のコメント必須化

### 11.2 マッチングシステム

- ✅ 企業と学生の相互評価に基づくマッチング
- ✅ 特別面談の設定
- ✅ 座談会のセッション管理
- ✅ マッチング結果の表示・CSV エクスポート
- ✅ **スコアシート出力**: 学生ごとの評価スコアシートを PDF で出力

### 11.3 認証システム

- ✅ 学生ログイン（イベント、席番号、電話番号のみ）
- ✅ クッキーベース認証（`httpOnly`クッキー）
- ✅ セッション管理

### 11.4 UI/UX 改善

- ✅ iPad 向け UI 最適化（`/recruiter`配下）
- ✅ モバイルサイドバー（ハンバーガーメニュー、左下固定）
- ✅ 学生ページのサイドバー非表示
- ✅ イベント選択機能（セッションストレージ管理）

### 11.5 リファクタリング

- ✅ 共通 API クライアントユーティリティ
- ✅ 統一された API レスポンス形式
- ✅ セッションストレージ管理フック
- ✅ エラーハンドリングの統一

## 12. 今後の改善点

### 12.1 機能追加

- [ ] メール通知機能
- [ ] ダッシュボード（統計情報の表示）
- [ ] バッチ処理（大量データの一括処理）

### 12.2 パフォーマンス

- [ ] データのキャッシュ戦略
- [ ] 画像最適化
- [ ] コード分割の最適化
- [ ] PDF 生成の最適化（大量の学生がいる場合）

### 12.3 UI/UX

- [ ] ローディング状態の改善
- [ ] アクセシビリティの向上
- [ ] 日本語フォント対応（PDF 生成）

## 13. トラブルシューティング

### 13.1 よくある問題

#### 認証エラー

- セッションが切れている可能性 → 再ログイン
- RLS ポリシーの問題 → マイグレーションを確認

#### データが表示されない

- RLS ポリシーを確認
- ロールが正しく設定されているか確認
- ブラウザのコンソールでエラーを確認

#### 型エラー

- `npm run types:generate`を実行して型定義を更新

### 13.2 ログ

- ブラウザの開発者ツール（コンソール）
- Supabase Dashboard（ログ）

## 14. 変更履歴

### 2025-01-XX (最新)

- **スコアシート出力機能**: マッチング結果から学生ごとの評価スコアシートを PDF で出力
- **学生ログインシステム**: イベント、席番号、電話番号のみでログイン（クッキーベース認証）
- **企業評価の改善**: 企業ベースの評価、評価者名の自動反映、S 評価の上限設定
- **学生からの評価閲覧**: グラフ表示、フィルタリング機能
- **イベント選択機能**: セッションストレージを使用したイベント選択
- **リファクタリング**: 共通ユーティリティの作成、API レスポンスの統一
- **UI 改善**: iPad 向け最適化、モバイルサイドバー改善、学生ページのサイドバー非表示

### 2025-01-XX (以前)

- 学生から企業への評価機能を追加
- コメントテンプレート機能を追加
- iPad 向け UI 最適化
- 未使用ファイルの削除
- マッチングシステムの実装

---

**最終更新日**: 2025-01-XX
**バージョン**: 0.2.0
