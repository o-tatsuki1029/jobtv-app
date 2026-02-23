# ドキュメント一覧

このディレクトリはプロジェクトの公式ドキュメントを格納しています。

## docs と rules の使い分け

- **docs/** = 開発者向け。仕様・規約・手順の**唯一の正本**。人間が読む・検索する・オンボーディングで渡す。
- **.cursor/rules/** = AI 向け。参照先の案内のみ。詳細は docs にあり、重複する内容は docs に集約する。

---

| ドキュメント | 説明 |
|--------------|------|
| [database-domain.md](database-domain.md) | DB・ドメインの用語・テーブル・振る舞いの公式な解釈（唯一の拠り所）。ドラフト/本番パターン、参照実装一覧。 |
| [roles-and-auth.md](roles-and-auth.md) | 3 ロール（admin/recruiter/candidate）、データ分離、認証・ロール取得・ルート保護、参照実装パス。 |
| [code-style.md](code-style.md) | ファイル命名、型安全性、コメント、インポートの規約。 |
| [server-actions.md](server-actions.md) | Server Actions の配置・命名・戻り値・エラーハンドリング・revalidatePath。 |
| [database.md](database.md) | マイグレーション管理・型定義の分類と配置・Supabase クライアントの使用。 |
| [ui-and-styling.md](ui-and-styling.md) | Tailwind、コンポーネント、データフェッチ、ページテーマの規約。 |
| [monorepo.md](monorepo.md) | モノレポ構成、パッケージ、開発ワークフロー、環境変数。 |
| [deployment.md](deployment.md) | デプロイ先（Vercel）と管理者画面（/admin）の IP 制限方針。 |
| [apps.md](apps.md) | アプリ概要・構成・環境変数・技術スタック（jobtv / event-system / agent-manager）。 |
| [setup.md](setup.md) | 環境構築・セットアップ手順。 |
| [seo.md](seo.md) | SEO 設計・メタデータ・robots 設定。 |
| [aws-video.md](aws-video.md) | AWS 動画ストリーミング（S3 / MediaConvert / CloudFront）連携。 |
| [event-specification.md](event-specification.md) | イベントシステムの詳細仕様。 |
| [test/](test/) | 機能別テスト観点・バグ候補（例: [company-page-flow.md](test/company-page-flow.md)）。 |
