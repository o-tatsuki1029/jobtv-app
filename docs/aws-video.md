# AWS 動画ストリーミング機能

JOBTV アプリケーションの動画アップロード・変換・配信機能の仕様書です。

## 概要

この機能は、動画ファイルを S3 にアップロードし、AWS MediaConvert を使用して HLS 形式に変換し、アダプティブストリーミング配信を実現します。

### 主な機能

- **S3 アップロード**: 動画ファイルとサムネイル画像を S3 にアップロード
- **HLS 変換**: MediaConvert を使用して複数解像度の HLS 形式に変換
- **アダプティブストリーミング**: 横長・縦長動画に対応した複数解像度の配信

## セットアップ

### 1. 依存関係のインストール

```bash
cd apps/jobtv
pnpm install
```

以下のパッケージがインストールされます：

- `@aws-sdk/client-s3`: S3 操作用（アップロード・削除・リスト）
- `@aws-sdk/s3-request-presigner`: Presigned URL 生成用
- `@aws-sdk/client-mediaconvert`: MediaConvert ジョブ作成用

### 2. 環境変数の設定

`apps/jobtv/.env.local` に以下の環境変数を追加してください：

```bash
# AWS基本設定
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# S3バケット名（1つのバケットに統一）
AWS_S3_BUCKET=jobtv-videos-stg

# MediaConvert設定
AWS_MEDIACONVERT_ROLE_ARN=arn:aws:iam::381249715032:role/MediaConvertServiceRole
AWS_MEDIACONVERT_TEMPLATE_LANDSCAPE=arn:aws:mediaconvert:ap-northeast-1:381249715032:jobTemplates/convert-to-hls-jobtv-landscape
AWS_MEDIACONVERT_TEMPLATE_PORTRAIT=arn:aws:mediaconvert:ap-northeast-1:381249715032:jobTemplates/convert-to-hls-jobtv-portrait

# CloudFront設定（必須）
AWS_CLOUDFRONT_URL=https://d1234567890.cloudfront.net
```

**注意**: 環境変数が設定されていない場合、デフォルトで`jobtv-videos-stg`が使用されます。

### 3. AWS リソースの準備

#### S3 バケットの作成

```bash
# AWS CLIで実行
aws s3 mb s3://jobtv-videos-stg --region ap-northeast-1
```

または、AWS コンソールから作成してください。

#### IAM ユーザー/ロールの設定

**アプリケーション用 IAM ユーザー**（S3 アップロード・MediaConvert ジョブ作成用）:

各権限の用途:

| 権限 | 用途 |
|------|------|
| `s3:PutObject` | 動画・サムネイルのアップロード（Presigned URL 経由） |
| `s3:GetObject` | 動画・サムネイルの取得（CloudFront 配信、MediaConvert 変換元読み取り） |
| `s3:DeleteObject` | ストレージ管理の削除キュー実行時のファイル削除 |
| `s3:ListBucket` | 孤立ファイルスキャン・プレフィックス配下の全ファイル削除（バケット自体への操作のため `/*` なしの ARN が必要） |
| `mediaconvert:CreateJob` | HLS 変換ジョブの作成（動画アップロード後に自動起動） |
| `mediaconvert:GetJob` | 変換ジョブの状態確認（進捗・完了・エラー） |
| `mediaconvert:ListJobs` | 管理画面での変換状況一覧表示 |
| `mediaconvert:DescribeEndpoints` | MediaConvert API エンドポイント URL の取得（リージョンごとに固有） |
| `iam:PassRole` | MediaConvert ジョブ作成時にサービスロールを渡すために必要。Condition で `mediaconvert.amazonaws.com` にのみ渡せるよう制限 |

**STG 用ポリシー**（IAM ユーザー: `jobtv-stg` 等に適用）:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "JobTvStgS3Objects",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::jobtv-videos-stg/*"
        },
        {
            "Sid": "JobTvStgS3List",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::jobtv-videos-stg"
        },
        {
            "Sid": "JobTvStgMediaConvert",
            "Effect": "Allow",
            "Action": [
                "mediaconvert:CreateJob",
                "mediaconvert:GetJob",
                "mediaconvert:ListJobs",
                "mediaconvert:DescribeEndpoints"
            ],
            "Resource": "*"
        },
        {
            "Sid": "JobTvStgPassRole",
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "arn:aws:iam::381249715032:role/JobTvMediaConvertRole",
            "Condition": {
                "StringEquals": {
                    "iam:PassedToService": "mediaconvert.amazonaws.com"
                }
            }
        }
    ]
}
```

**PROD 用ポリシー**（IAM ユーザー: `jobtv-prod` 等に適用）:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "JobTvProdS3Objects",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::jobtv-videos-prod/*"
        },
        {
            "Sid": "JobTvProdS3List",
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::jobtv-videos-prod"
        },
        {
            "Sid": "JobTvProdMediaConvert",
            "Effect": "Allow",
            "Action": [
                "mediaconvert:CreateJob",
                "mediaconvert:GetJob",
                "mediaconvert:ListJobs",
                "mediaconvert:DescribeEndpoints"
            ],
            "Resource": "*"
        },
        {
            "Sid": "JobTvProdPassRole",
            "Effect": "Allow",
            "Action": "iam:PassRole",
            "Resource": "arn:aws:iam::381249715032:role/JobTvMediaConvertRole",
            "Condition": {
                "StringEquals": {
                    "iam:PassedToService": "mediaconvert.amazonaws.com"
                }
            }
        }
    ]
}
```

> STG と PROD の差分は **S3 バケット名のみ**。MediaConvert のロール・権限は同一アカウント内で共用。

**MediaConvert サービスロール**（`JobTvMediaConvertRole` — MediaConvert ジョブが S3 にアクセスする用）:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": [
        "arn:aws:s3:::jobtv-videos-stg/companies/*",
        "arn:aws:s3:::jobtv-videos-stg/admin/*",
        "arn:aws:s3:::jobtv-videos-stg/transcoded/*",
        "arn:aws:s3:::jobtv-videos-prod/companies/*",
        "arn:aws:s3:::jobtv-videos-prod/admin/*",
        "arn:aws:s3:::jobtv-videos-prod/transcoded/*"
      ]
    }
  ]
}
```

#### MediaConvert テンプレートの作成

1. AWS MediaConvert コンソールにアクセス
2. 「ジョブテンプレート」→「作成」
3. 以下の JSON ファイルの内容を使用：
   - `convert-to-hls-jobtv-landscape.json`（横長用）
   - `convert-to-hls-jobtv-portrait.json`（縦長用）
4. テンプレート ARN を環境変数に設定

## 仕様

### 動画アップロード仕様

#### 対応形式

- **動画**: MP4, WebM, QuickTime (MOV), AVI
- **画像（サムネイル）**: JPEG, PNG, WebP, GIF

#### ファイルサイズ制限

- **動画ファイル**: 最大 500MB（Presigned URL 経由の直接アップロード）
- **サムネイル**: 最大 10MB
- **Next.js ボディサイズ制限**: 10MB（Server Action 経由のアップロードはサムネイル等のみ）

#### アップロード方式

動画は **Presigned URL** を使用してブラウザから S3 に直接アップロードします（Server Action 経由のアップロードは廃止）。

```
1. ブラウザ → Server Action（Presigned URL 取得）
2. ブラウザ → S3 に直接 PUT（XMLHttpRequest、プログレスバー付き）
3. ブラウザ → Server Action（確認 → MediaConvert 起動 + DB 更新）
```

**関連ファイル:**
- `lib/aws/s3-presigned.ts` — Presigned URL 生成（15分有効期限、500MB上限、MIMEチェック）
- `hooks/useS3Upload.ts` — クライアント直接アップロード hook（プログレスバー対応）
- `lib/aws/s3-singleton.ts` — S3Client シングルトン（`"use server"` 外で共有）

#### アップロード先

- **動画（通常）**: `s3://jobtv-videos-stg/companies/{companyId}/videos/{draftId}/original.{ext}`
- **サムネイル**: `s3://jobtv-videos-stg/companies/{companyId}/videos/{draftId}/thumbnail.{ext}`
- **ヒーロー動画**: `s3://jobtv-videos-stg/admin/hero-items/{heroItemId}/original.{ext}`

#### S3オブジェクトメタデータ

S3 の `x-amz-meta-*` ヘッダーは **ASCII のみ** 許容されます。そのため、動画・サムネイルアップロード時に付与するメタデータの `originalFileName` には、ユーザーのファイル名ではなくアップロード時に生成したランダム32桁英数字（hex）を格納しています。

### HLS 変換仕様

#### 対応アスペクト比

- **横長（Landscape）**: 16:9 形式の動画
- **縦長（Portrait）**: 9:16 形式の動画

#### 出力解像度

**横長動画**:

- 1080p: 1920x1080, 5Mbps
- 720p: 1280x720, 3Mbps

**縦長動画**:

- 1080p: 1080x1920, 5Mbps
- 720p: 720x1280, 3Mbps

#### HLS 設定

- **セグメント長**: 5 秒
- **コーデック**: H.264 (ビデオ), AAC (オーディオ)
- **オーディオビットレート**: 128kbps
- **レート制御**: QVBR（品質可変ビットレート）

#### 出力先

- **変換済み動画（横長）**: `s3://jobtv-videos-stg/transcoded/landscape/{companyId}/videos/{videoId}/hls/`
- **変換済み動画（縦長）**: `s3://jobtv-videos-stg/transcoded/portrait/{companyId}/videos/{videoId}/hls/`
- **サムネイル**: 変換済み動画と同じディレクトリ内（Frame Capture）

### ファイル構造

S3 バケット内のファイル構造（`jobtv-videos-stg`バケット内）：

```
jobtv-videos-stg/
├── companies/                       # 企業コンテンツ
│   └── {companyId}/
│       └── videos/
│           └── {draftId}/           # videos_draft.id（各動画固有プレフィックス）
│               ├── original.{ext}   # Presigned URL でアップロードされた元動画
│               ├── thumbnail.{ext}  # サムネイル画像
│               └── hls/
│                   └── {landscape|portrait}/
│                       ├── original.m3u8        # マスターマニフェスト（DB の video_url）
│                       ├── master_1080p.m3u8
│                       ├── master_720p.m3u8
│                       └── *.ts                 # セグメントファイル
├── admin/                           # 管理者コンテンツ
│   └── hero-items/                  # トップページヒーローアイテム動画
│       └── {heroItemId}/
│           ├── original.{ext}       # Presigned URL でアップロードされた元動画
│           └── hls/
│               └── landscape/
│                   ├── original.m3u8
│                   ├── master_1080p.m3u8
│                   ├── master_720p.m3u8
│                   └── *.ts
├── source/                          # （レガシー）旧アップロード先
│   └── ...
├── thumbnails/                      # （レガシー）旧サムネイル置き場
│   └── ...
└── transcoded/                      # （レガシー）旧変換出力先
    └── ...
```

> **注意**: `source/`, `thumbnails/`, `transcoded/` は Presigned URL 導入前のレガシーパスです。新規アップロードは `companies/` 配下に格納されます。

## 使用方法

### 動画のアップロード（Presigned URL）

動画は Presigned URL を使用してブラウザから S3 に直接アップロードします。

```typescript
// 1. Server Action で Presigned URL を取得
import { getVideoUploadPresignedUrl, confirmVideoUpload } from "@/lib/actions/video-actions";

const { data, error } = await getVideoUploadPresignedUrl(draftId, file.name, file.type);
if (error) throw new Error(error);

// 2. ブラウザから S3 に直接 PUT（useS3Upload hook を使用）
import { useS3Upload } from "@/hooks/useS3Upload";
const { upload, progress } = useS3Upload();
await upload(data.presignedUrl, file);

// 3. アップロード完了を確認（MediaConvert 起動 + DB 更新）
await confirmVideoUpload(draftId, data.s3Key, file.type);
```

**`useS3Upload` hook の機能:**
- XMLHttpRequest による PUT（プログレスバー対応）
- アップロード進捗率（0-100）をリアルタイムで取得
- エラーハンドリング、タイムアウト管理

### HLS マニフェスト URL の取得

```typescript
import { getHlsManifestUrl } from "@/lib/aws/cloudfront-client";

// HLSマニフェストURLを取得（CloudFront URL、設定されていない場合はnull）
const hlsUrl = getHlsManifestUrl(companyId, videoId, "landscape");
// または
const hlsUrl = getHlsManifestUrl(companyId, videoId, "portrait");
```

### サムネイルのアップロード

```typescript
import { uploadThumbnailToS3Action } from "@/lib/actions/video-actions";

const result = await uploadThumbnailToS3Action(file, videoId);

if (result.error) {
  console.error("アップロードエラー:", result.error);
} else {
  console.log("S3キー:", result.data?.s3Key);
  console.log("URL:", result.data?.url);
}
```

### MediaConvert ジョブの作成

`uploadVideoToS3Action`を呼び出すと、自動的に MediaConvert ジョブが作成されます。

手動でジョブを作成する場合：

```typescript
import { createMediaConvertJob } from "@/lib/aws/mediaconvert-client";

const result = await createMediaConvertJob({
  videoId,
  companyId,
  sourceS3Key: s3Key,
  aspectRatio: "landscape" // または "portrait"
});

if (result.error) {
  console.error("ジョブ作成エラー:", result.error);
} else {
  console.log("ジョブID:", result.jobId);
}
```

## アダプティブストリーミング

### 仕組み

1. **複数解像度の生成**: MediaConvert が 2 つの解像度（1080p, 720p）の動画を生成
2. **マニフェストファイル**: `original.m3u8`（マスター）に全解像度の情報を記載
3. **自動選択**: クライアント（HLS.js 等）がネットワーク状況に応じて最適な解像度を自動選択

### メリット

- **ネットワーク最適化**: 回線速度に応じて自動的に画質を調整
- **端末最適化**: スマホ・PC・タブレットに最適な解像度を配信
- **データ使用量の最適化**: 必要以上に高画質を配信しない

### デメリット

- **ストレージ容量**: 元動画の約 2 倍の容量が必要
- **変換時間**: 2 解像度分の処理時間が必要
- **コスト**: MediaConvert の処理時間と S3 のストレージ容量が増加

## MediaConvert テンプレート設定

### テンプレートファイル

- `convert-to-hls-jobtv-landscape.json`: 横長動画用テンプレート
- `convert-to-hls-jobtv-portrait.json`: 縦長動画用テンプレート

### テンプレートの作成方法

1. AWS MediaConvert コンソールにアクセス
2. 「ジョブテンプレート」→「作成」
3. JSON ファイルの内容をコピー＆ペースト
4. 出力先（Destination）を設定:
   - `s3://jobtv-videos-stg/transcoded/{companyId}/videos/{videoId}/hls/`
5. IAM ロールを選択（MediaConvertServiceRole）
6. テンプレートを保存
7. テンプレート ARN を環境変数に設定

## トラブルシューティング

### エラー: "AWS 認証情報が設定されていません"

環境変数 `AWS_ACCESS_KEY_ID` と `AWS_SECRET_ACCESS_KEY` が正しく設定されているか確認してください。

### エラー: "AWS_S3_BUCKET が設定されていません"

環境変数 `AWS_S3_BUCKET` が設定されているか確認してください。設定されていない場合、デフォルトで`jobtv-videos-stg`が使用されます。

### アクセス拒否エラー

IAM ユーザー/ロールに適切な S3 権限が付与されているか確認してください。

### MediaConvert ジョブが失敗する

- IAM ロール（MediaConvertServiceRole）に S3 へのアクセス権限があるか確認
- 入力ファイル（S3 キー）が正しいか確認
- 出力先バケットが存在するか確認
- テンプレート ARN が正しいか確認

### HLS ファイルが生成されない

- MediaConvert ジョブのステータスを確認
- ジョブのエラーメッセージを確認
- S3 の出力先ディレクトリを確認

### 「HLS network error, using fallback」または CORS エラー（Access-Control-Allow-Origin）

ブラウザのコンソールに `Access to XMLHttpRequest at 'https://...cloudfront.net/.../original.m3u8' from origin 'http://localhost:3000' has been blocked by CORS policy` と出る場合、CloudFront のオリジン（S3）に CORS が設定されていません。上記「[CORS の設定（HLS 再生に必須）](#cors-の設定hls-再生に必須)」のとおり、S3 バケットの CORS で `AllowedOrigins` に `http://localhost:3000`（および本番ドメイン）を追加してください。

#### 同じ原因で出る他のメッセージ（エラー分析）

| メッセージ | 原因 |
|------------|------|
| **Manifest: Line: 1, column: 1, Syntax error.** | CORS でレスポンスがブロックされ、HLS.js が取得できた「中身」（空や HTML エラーページ）を M3U8 としてパースしようとして失敗している。根本原因は CORS 未設定。 |
| **GET .../original.m3u8 net::ERR_FAILED 200 (OK)** | サーバーは 200 で .m3u8 を返しているが、レスポンスに `Access-Control-Allow-Origin` がないため、ブラウザが JavaScript にレスポンスを渡せず「ネットワークエラー」扱いになる。200 なのに ERR_FAILED なのは CORS 違反によるもの。 |

いずれも **S3 および必要に応じて CloudFront の CORS 設定** で解消します。

## CloudFront の設定

### CloudFront ディストリビューションの作成

1. AWS CloudFront コンソールにアクセス
2. 「ディストリビューションを作成」をクリック
3. オリジンドメイン: S3 バケット（`jobtv-videos-stg`）を選択
4. ビューアープロトコルポリシー: 「Redirect HTTP to HTTPS」を推奨
5. キャッシュキーとオリジンリクエスト: 「CachingOptimized」を推奨
6. デフォルトのルートオブジェクト: 空欄
7. ディストリビューションを作成
8. 作成後、ディストリビューションのドメイン名（例: `d1234567890.cloudfront.net`）をコピー
9. 環境変数 `AWS_CLOUDFRONT_URL` に設定（プロトコルを含む: `https://d1234567890.cloudfront.net`）

### CORS の設定（HLS 再生に必須）

ブラウザから CloudFront 経由で HLS（.m3u8 / .ts）を取得するため、**CORS の設定が必須**です。未設定だと `Access-Control-Allow-Origin` が無いとしてブロックされ、「動画の読み込みに失敗しました」や「HLS network error, using fallback」が出ます。

#### 1. S3 バケットの CORS 設定

1. AWS コンソール → **S3** → 対象バケット（例: `jobtv-videos-stg`）を選択
2. **アクセス許可** タブ → **CORS (クロスオリジンリソース共有)** の「編集」
3. 以下の JSON を設定（`http://localhost:3000` は開発用。本番ドメインも必要に応じて追加）

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://jobtv.jp",
      "https://media.jobtv.jp"
    ],
    "ExposeHeaders": ["Content-Length", "Content-Type", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. 変更を保存

#### 2. CloudFront でオリジンの CORS を有効にする

- **オリジンアクセス**で S3 を「オリジンアクセスコントロール (OAC)」または「パブリック」で参照している場合、S3 が返す CORS ヘッダーはそのまま CloudFront が転送します。上記 S3 の CORS だけで動作する場合があります。
- それでも CORS エラーが出る場合は、CloudFront の **動作** → 該当の動作を編集 → **レスポンスヘッダーポリシー** で、以下のようなカスタムポリシーを追加します。
  - **レスポンスヘッダーポリシー** を作成し、以下のカスタムヘッダーを追加:
    - `Access-Control-Allow-Origin`: `*`（すべて許可）または `https://your-domain.com`（本番のみ）
    - 開発時は `http://localhost:3000` を許可するため、複数オリジンが必要な場合は S3 の CORS に任せ、CloudFront は「CORS-CustomOrigin」などのプリセットを使うか、S3 の CORS が正しく返ることを確認してください。

**確認方法**: ブラウザの開発者ツールのネットワークタブで、`.m3u8` へのリクエストの **レスポンスヘッダー** に `Access-Control-Allow-Origin` が含まれていれば CORS は有効です。

### CloudFront のメリット

- **高速配信**: エッジロケーションから配信されるため、世界中のユーザーに高速アクセス
- **コスト削減**: S3 の直接アクセスより転送コストを削減
- **スケーラビリティ**: 大量のアクセスにも対応
- **セキュリティ**: 署名付き URL やアクセス制御が可能

### 注意事項

- **CloudFront は必須です**。環境変数 `AWS_CLOUDFRONT_URL` が設定されていない場合、エラーが発生します
- CloudFront のキャッシュを無効化する場合は、AWS コンソールから「Invalidation」を作成してください

## 今後の実装予定

- [ ] SNS 通知による変換完了の検知

---

## 仕組みのサマリー（チーム共有用）

### 全体の流れ

```
[ユーザーが動画をアップロード]
         ↓
[1. S3 に元動画を保存]
    s3://jobtv-videos-stg/source/{companyId}/videos/{videoId}/original.mp4
         ↓
[2. MediaConvert で HLS 変換（自動起動）]
    - アップロード時に選択した横長/縦長に応じて適切なテンプレートを使用
    - 2 つの解像度（1080p, 720p）を生成
    - セグメント（5 秒単位）に分割
         ↓
[3. 変換済み動画を S3 に保存]
    s3://jobtv-videos-stg/transcoded/{landscape|portrait}/{companyId}/videos/{videoId}/hls/
    ├── original.m3u8 (マスターマニフェスト、アプリが参照)
    ├── master_1080p.m3u8, master_1080p00000.ts, ...
    └── master_720p.m3u8, master_720p00000.ts, ...
         ↓
[4. フロントエンドで HLS 再生]
    - CloudFront URL（設定されている場合）または S3 URL から original.m3u8 を読み込み
    - HLS.js がネットワーク状況に応じて最適な解像度を自動選択
    - ユーザーにスムーズな動画体験を提供
```

### なぜこの仕組みなのか？

#### 1. **アダプティブストリーミングの必要性**

- **問題**: ユーザーのネットワーク環境は様々（高速 Wi-Fi から低速 4G まで）
- **解決**: 複数の解像度を用意し、回線速度に応じて自動的に最適な画質を配信
- **結果**: 途切れにくく、データ使用量も最適化された動画再生

#### 2. **横長・縦長の両対応**

- **問題**: スマホで撮影した縦長動画と、PC で撮影した横長動画が混在
- **解決**: アスペクト比を自動判定し、適切なテンプレートで変換
- **結果**: どちらの動画も綺麗に配信可能

#### 3. **HLS 形式の採用**

- **理由**: iOS Safari を含む主要ブラウザで標準サポート
- **メリット**: 専用プラグイン不要、セキュリティも高い
- **業界標準**: YouTube、Netflix も同様の仕組みを使用

### 技術スタック

| サービス             | 役割                                       |
| -------------------- | ------------------------------------------ |
| **Amazon S3**        | 動画ファイルの保存（元動画・変換済み動画） |
| **AWS MediaConvert** | 動画の HLS 形式への変換処理                |
| **HLS.js**           | フロントエンドでの HLS 動画再生            |
| **CloudFront**       | CDN による高速配信（オプション）           |

### コストの目安

- **S3 ストレージ**: 元動画の約 2 倍の容量が必要（2 解像度分）
- **MediaConvert**: 動画の長さと解像度に応じて課金（約 $0.0075/分）
- **データ転送**: CloudFront 経由で配信する場合、転送量に応じて課金

### よくある質問

**Q: なぜ 2 つの解像度が必要？**  
A: ネットワーク環境が様々なユーザーに最適な体験を提供するため。1 つだけだと、高速回線のユーザーには低画質、低速回線のユーザーには途切れが発生する。2 つの解像度（1080p と 720p）で、多くのユーザーに適切な画質を提供できる。

**Q: 変換に時間がかかるのでは？**  
A: MediaConvert は並列処理で高速変換。通常の動画（5 分程度）なら数分で完了。変換中は元動画を表示し、完了後に HLS に切り替える設計も可能。

**Q: ストレージコストが高くない？**  
A: 確かに元動画の約 2 倍の容量が必要。ただし、ユーザー体験の向上と、データ使用量の最適化により、長期的にはメリットが大きい。必要に応じて、古い動画のライフサイクルポリシーで自動削除も可能。

**Q: 既存の動画はどうなる？**  
A: 既存の動画は従来の方式（MP4 直接配信）を継続。新規アップロード分から HLS 変換を適用。必要に応じて既存動画も段階的に変換可能。

### 参考資料

- [AWS MediaConvert 公式ドキュメント](https://docs.aws.amazon.com/mediaconvert/)
- [HLS.js 公式ドキュメント](https://github.com/video-dev/hls.js/)
- [アダプティブストリーミングの仕組み](https://aws.amazon.com/jp/solutions/implementations/live-streaming-on-aws/)

---

## ストレージ管理（削除キュー）

### 概要

ストレージファイルの削除は **削除キュー** を通じて管理されます。直接削除（fire-and-forget）は行わず、すべての削除操作は `storage_deletion_queue` テーブルにキューイングされ、管理者の承認後に実行されます。

### 削除フロー

```
[動画/画像の削除・更新操作]
  │  enqueueStorageDeletion() で登録
  ▼
storage_deletion_queue (status: pending)
  │  管理画面で承認
  ▼
storage_deletion_queue (status: approved)
  │  管理画面で実行 or Cron ジョブ
  ▼
S3/Supabase から実際に削除 → status: completed
```

### 対象操作

| 操作 | 対象ストレージ | キュー登録内容 |
|------|--------------|--------------|
| 動画削除 (`deleteVideoPhysically`) | S3 | `companies/{companyId}/videos/{draftId}/` プレフィックス削除 |
| ヒーロー削除 (`deleteTopPageHeroItem`) | S3 + Supabase | S3 プレフィックス + Supabase サムネイル |
| ヒーロー更新 (サムネイル差替) | Supabase | 旧サムネイルファイル |
| LPサンプル動画削除/更新 | Supabase | `admin/lp-videos/{id}/` |
| LP企業ロゴ削除/更新 | Supabase | `admin/lp-logos/{id}/` |
| アンバサダー削除/更新 | Supabase | `admin/ambassadors/{id}/` |
| シュン日記削除/更新 | Supabase | `admin/shun-diaries/{id}/` |
| フルスキャン（孤立ファイル検出） | S3 + Supabase | 孤立ファイル個別 |

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `lib/storage/deletion-queue.ts` | キュー操作（登録・実行） |
| `lib/aws/s3-delete.ts` | S3 削除ユーティリティ |
| `lib/storage/storage-cleanup.ts` | Supabase Storage 削除ユーティリティ |
| `lib/actions/storage-cleanup-actions.ts` | 管理画面用 Server Actions |
| `app/admin/(dashboard)/storage-cleanup/page.tsx` | 管理画面 UI |
| `app/api/cron/storage-cleanup/route.ts` | Cron ジョブ（承認済み実行 + スケジュールスキャン） |

### 管理画面

`/admin/storage-cleanup` から以下の操作が可能:

- **削除キュータブ**: 未承認/承認済み/完了/失敗のフィルタリング、個別・一括承認、実行、履歴クリア
- **スキャン予約タブ**: 日時範囲を指定した孤立ファイルスキャンの予約・即時実行

### AWS 認証情報ガード

`isS3Available()` 関数で AWS 認証情報の存在をチェックし、ローカル開発など認証情報がない環境では S3 操作をスキップします（`logger.warn` でログ出力）。

---

## S3 ライフサイクルポリシー（推奨設定）

AWS コンソールの S3 バケット管理 → ライフサイクルルールで以下を手動設定:

| ルール名 | プレフィックス | アクション |
|---------|-------------|---------|
| original-to-glacier | `companies/*/videos/*/original.*`, `admin/hero-items/*/original.*` | 90日後 → Glacier、365日後 → 削除 |
| abort-multipart | （バケット全体） | 未完了マルチパートアップロード → 7日後自動削除 |

> **目的**: 元動画（original）は HLS 変換後は再生に使用されないため、コスト削減のため Glacier に移行。未完了のマルチパートアップロードは自動クリーンアップ。
