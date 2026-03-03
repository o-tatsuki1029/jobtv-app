# ドキュメント索引（トピック別参照先）

詳細は常に docs を参照する。以下はトピック別の doc 一覧。

## AI への指示

- **必要な doc を読む**: トピックに触れる前に、下表の参照先 doc を読む。推測で実装しない。
- **関連する変更時は doc も更新する**: 仕様・規約・振る舞い（テーブル・ロール・API・画面フロー等）に影響する変更をしたら、関連する doc もあわせて更新する。
- **用語・テーブルの解釈**: `docs/database-domain.md` を正とする。意味で迷ったらそこで確認する。
- **DB を変更したとき**: マイグレーション・テーブル役割・RLS 等の変更後は、必ず `docs/database-domain.md` を更新する。該当セクションの「参照実装」に挙がる他機能の整合も確認する。
- **複数 doc に影響する変更**: 該当する doc をすべて更新する（例: 新規テーブルなら database-domain と必要に応じて database.md 等）。

## トピック別参照先

| トピック | 参照先 |
|----------|--------|
| 用語・テーブル・振る舞い・ドラフト/本番 | `docs/database-domain.md` |
| DB 変更時の doc 更新義務・影響範囲確認 | `docs/database-domain.md` |
| 認証・ロール・ルート保護・データ分離 | `docs/roles-and-auth.md` |
| Server Actions | `docs/server-actions.md` |
| データベース型・マイグレーション・Supabase クライアント | `docs/database.md` |
| スタイリング・コンポーネント・データフェッチ・テーマ | `docs/ui-and-styling.md` |
| コード規約（命名・型・インポート） | `docs/code-style.md` |
| Monorepo・パッケージ・環境変数 | `docs/monorepo.md` |
| デプロイ・admin IP 制限 | `docs/deployment.md` |
| アプリ構成・技術スタック | `docs/apps.md` |
