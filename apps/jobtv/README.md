# JOBTV

動画就活情報サイト - 企業の就活情報を動画で探せるサービス

## ポート番号

- 開発環境: `http://localhost:3000`

## 起動方法

```bash
# monorepoルートから
pnpm --filter jobtv dev

# または、jobtvディレクトリで
pnpm dev
```

## 詳細ドキュメント

- [アプリケーション概要](../../docs/apps.md#1-jobtv-port-3000)
- [認証・ロールの扱い](../../docs/apps.md#1-jobtv-port-3000)（ロールはページ読み込み時の値を使い、その他の処理に利用する）
- [セットアップガイド](../../docs/setup.md)
- [AWS 動画ストリーミング機能](../../docs/aws-video.md)
- [データベース管理](../../docs/database.md)
