# アプリケーション概要

JobTV App Monorepo には、3 つの Next.js アプリケーションが含まれています。

## アプリケーション一覧

| アプリ名          | ポート | 説明                     |
| ----------------- | ------ | ------------------------ |
| **jobtv**         | 3000   | JobTV 動画就活情報サイト |
| **event-system**  | 3001   | イベント運営システム     |
| **agent-manager** | 3002   | エージェント管理システム |

---

## 1. JobTV (port 3000)

### 概要

JobTV は新卒採用をする企業の就活情報を動画で探せるサービスです。企業密着、社員インタビュー、職場見学など、リアルな情報を無料で視聴できます。

### 主な機能

- **動画配信**: HLS 形式のアダプティブストリーミング
- **企業プロフィール**: 企業情報、動画、求人情報の管理
- **AWS 連携**: S3、MediaConvert、CloudFront を使用した動画処理
- **認証**: Supabase Auth によるユーザー認証
- **スタジオ機能**: 企業向けの動画・プロフィール管理画面

### 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 4
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth
- **動画処理**: AWS S3, MediaConvert, CloudFront
- **動画再生**: HLS.js

### ディレクトリ構成

```
apps/jobtv/
├── app/                    # Next.js App Router
│   ├── (main)/            # メインサイト
│   ├── studio/            # 企業向けスタジオ
│   └── api/               # API Routes
├── components/            # コンポーネント
│   ├── ui/               # 共有UIコンポーネント
│   ├── video/            # 動画関連コンポーネント
│   └── studio/           # スタジオ関連コンポーネント
├── lib/                   # ライブラリとユーティリティ
│   ├── actions/          # Server Actions
│   ├── aws/              # AWS連携
│   └── supabase/         # Supabaseクライアント
├── constants/            # 定数定義
├── hooks/                # カスタムフック
└── types/                # 型定義
```

### 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key
NEXT_PUBLIC_SITE_URL=localhost:3000

# AWS設定（動画機能）
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=jobtv-videos-stg
AWS_CLOUDFRONT_URL=https://your-cloudfront-domain
```

### 認証・ロールの扱い

- **ロールはページ（レイアウト）読み込み時に取得した値を使う**。ヘッダー表示・UI の出し分け・その他の処理は、すべてこの「読み込み時に確定したロール」に基づいて行う。
- メインサイト `(main)` では、レイアウトで `getHeaderAuthInfo()` を実行し、取得した認証情報（ユーザー・ロール・リクルーター用メニュー情報）を `HeaderAuthProvider` 経由で配布している。各コンポーネントは `useHeaderAuth()` でこれを参照する。
- ログイン・ログアウト時は `onAuthStateChange` で再取得し、以降はその最新値を使用する。画面表示のたびにクライアントや Server Action でロールを再取得しない。

### 関連ドキュメント

- [AWS 動画ストリーミング機能](./aws-video.md)

---

## 2. Event System (port 3001)

### 概要

企業と学生のマッチングイベントを管理・運営するための Web アプリケーションです。管理者、企業担当者、学生の 3 つのロールが存在し、それぞれの権限に応じた機能を提供します。

### 主な機能

- **イベント管理**: イベントの作成、編集、削除
- **学生管理**: 学生情報の登録、編集、CSV インポート/エクスポート
- **企業管理**: 企業情報の登録、編集、CSV インポート
- **企業担当者管理**: 企業担当者アカウントの作成、編集
- **評価システム**: 学生と企業の相互評価
- **マッチング**: 評価に基づく学生と企業のマッチング
- **レポート**: イベント結果の PDF 出力、統計グラフ表示

### 認証方式

- **管理者・企業担当者**: Supabase Auth（メール/パスワード）
  - 管理者ロール: `admin`
  - 企業担当者ロール: `recruiter`
- **学生**: イベント、席番号、電話番号のみでログイン（クッキーベース認証）

### 技術スタック

- **フレームワーク**: Next.js 15.5.6 (App Router)
- **言語**: TypeScript 5
- **UI**: React 19.1.0, Tailwind CSS 4.1.16
- **認証・データベース**: Supabase (PostgreSQL)
- **PDF 生成**: jsPDF
- **グラフ表示**: Recharts
- **デプロイ**: Vercel (推奨)

### ディレクトリ構成

```
apps/event-system/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理者画面
│   ├── recruiter/         # 企業担当者画面
│   ├── candidate/         # 学生画面
│   ├── login/             # ログイン
│   └── api/               # API Routes
├── components/            # コンポーネント
│   ├── ui/               # 共有UIコンポーネント
│   ├── admin/            # 管理者用コンポーネント
│   ├── recruiter/        # 企業担当者用コンポーネント
│   └── evaluation/       # 評価関連コンポーネント
├── lib/                   # ライブラリとユーティリティ
│   ├── actions/          # Server Actions
│   └── supabase/         # Supabaseクライアント
├── types/                 # 型定義
├── hooks/                 # カスタムフック
├── utils/                 # ユーティリティ関数
└── constants/            # 定数定義
```

### 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BASIC_AUTH_USERNAME=admin
BASIC_AUTH_PASSWORD=your-password
```

### 関連ドキュメント

- [イベントシステム詳細仕様](./event-specification.md)

---

## 3. Agent Manager (port 3002)

### 概要

エージェント管理システム - 候補者、企業、求人、応募の管理を行う Next.js アプリケーションです。

### 主な機能

- **候補者管理**: 登録、編集、検索
- **企業管理**: 登録、編集、求人紐付け
- **求人管理**: 作成、編集、応募状況管理
- **応募管理**: ステータス管理、進捗追跡
- **面接ノート管理**: 面接記録の管理
- **管理者アカウント管理**: ユーザー管理

### 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **UI コンポーネント**: shadcn/ui
- **データベース**: Supabase
- **認証**: Supabase Auth

### ディレクトリ構成

```
apps/agent-manager/
├── app/                    # Next.js App Router
│   ├── admin/             # 管理画面
│   └── auth/              # 認証関連ページ
├── components/            # コンポーネント
│   └── ui/               # 共有UIコンポーネント
├── lib/                   # ライブラリとユーティリティ
│   ├── actions/          # Server Actions
│   └── supabase/         # Supabaseクライアント
├── constants/            # 定数定義
└── utils/                # ユーティリティ関数
```

### 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-key
BASIC_AUTH_USER=admin
BASIC_AUTH_PASSWORD=your-password
```

---

## 共通の技術要素

### 共通パッケージ (@jobtv-app/shared)

すべてのアプリで共有される機能：

- **Supabase クライアント**: サーバー/クライアント/管理者クライアント
- **型定義**: データベース型、拡張型、共通ヘルパー型
- **認証ヘルパー**: 認証関連のユーティリティ
- **ユーティリティ**: 共通のヘルパー関数

### データベース

すべてのアプリが同じ Supabase データベースを共有します：

- **プロジェクト ID**: `tdewumilkltljbqryjpg`
- **マイグレーション管理**: `jobtv-app/supabase/migrations/`で一元管理
- **型定義**: `packages/shared/types/database.types.ts`で自動生成

### 開発ワークフロー

```bash
# 全アプリを並列起動
pnpm dev

# 個別のアプリを起動
pnpm --filter jobtv dev
pnpm --filter event-system dev
pnpm --filter agent-manager dev

# ビルド
pnpm build
pnpm --filter jobtv build
```

## 次のステップ

- [セットアップガイド](./setup.md) - 環境構築の詳細
- [データベース管理](./database.md) - マイグレーション管理
- [コーディング規約](../.cursor/rules/) - 開発ルール
