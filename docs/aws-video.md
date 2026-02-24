# AWS 動画ストリーミング機能

JobTV アプリケーションの動画アップロード・変換・配信機能の仕様書です。

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

- `@aws-sdk/client-s3`: S3 アップロード用
- `@aws-sdk/client-mediaconvert`: MediaConvert ジョブ作成用（今後実装予定）

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

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::jobtv-videos-stg/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "mediaconvert:CreateJob",
        "mediaconvert:GetJob",
        "mediaconvert:ListJobs",
        "mediaconvert:DescribeEndpoints"
      ],
      "Resource": "*"
    }
  ]
}
```

**MediaConvert サービスロール**（MediaConvert ジョブが S3 にアクセスする用）:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": ["arn:aws:s3:::jobtv-videos-stg/source/*", "arn:aws:s3:::jobtv-videos-stg/transcoded/*"]
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

- **動画ファイル**: 最大 50MB
- **サムネイル**: 最大 10MB

#### アップロード先

- **動画（横長）**: `s3://jobtv-videos-stg/source/landscape/{companyId}/videos/{videoId}/original.{ext}`
- **動画（縦長）**: `s3://jobtv-videos-stg/source/portrait/{companyId}/videos/{videoId}/original.{ext}`
- **サムネイル**: `s3://jobtv-videos-stg/thumbnails/{companyId}/videos/{videoId}/thumbnail.{ext}`

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
├── source/                          # アップロード元動画
│   ├── landscape/                  # 横長動画
│   │   └── {companyId}/
│   │       └── videos/
│   │           └── {videoId}/
│   │               └── original.{ext}
│   └── portrait/                   # 縦長動画
│       └── {companyId}/
│           └── videos/
│               └── {videoId}/
│                   └── original.{ext}
├── thumbnails/                      # サムネイル画像
│   └── {companyId}/
│       └── videos/
│           └── {videoId}/
│               └── thumbnail.{ext}
└── transcoded/                      # 変換済み動画（HLS）
    ├── landscape/                   # 横長動画の変換済み
    │   └── {companyId}/
    │       └── videos/
    │           └── {videoId}/
    │               └── hls/
    │                   ├── original.m3u8            # マスターマニフェスト（アプリはこのURLを参照）
    │                   ├── master_1080p.m3u8         # 1080pマニフェスト
    │                   ├── master_720p.m3u8          # 720pマニフェスト
    │                   ├── master_1080p00000.ts     # 1080pセグメント
    │                   ├── master_720p00000.ts     # 720pセグメント
    │                   └── master-thumb00000.jpg    # サムネイル
    └── portrait/                    # 縦長動画の変換済み
        └── {companyId}/
            └── videos/
                └── {videoId}/
                    └── hls/
                        ├── original.m3u8
                        ├── master_1080p.m3u8
                        ├── master_720p.m3u8
                        ├── master_1080p00000.ts
                        ├── master_720p00000.ts
                        └── master-thumb00000.jpg
```

## 使用方法

### 動画のアップロード

```typescript
import { uploadVideoToS3Action } from "@/lib/actions/video-actions";

// 横長動画をアップロード
const result = await uploadVideoToS3Action(file, "landscape", videoId);

// または縦長動画をアップロード
const result = await uploadVideoToS3Action(file, "portrait", videoId);

if (result.error) {
  console.error("アップロードエラー:", result.error);
} else {
  console.log("S3キー:", result.data?.s3Key);
  console.log("URL:", result.data?.url); // CloudFront URL（設定されている場合）またはS3 URL
  console.log("S3 URL:", result.data?.s3Url); // 元のS3 URL
  // MediaConvertジョブが自動的に起動されます
}
```

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
