# Server Actions

このドキュメントは、Server Actions の配置・命名・戻り値・エラーハンドリングの開発者向けの規約の正本です。

---

## 配置と命名

- サーバー側のデータ変更は必ず Server Actions を使用する
- **すべてのプロジェクトで `lib/actions/` ディレクトリに配置する**（統一ルール）
- ファイル命名: `{エンティティ}-actions.ts`（例: `candidate-actions.ts`, `auth-actions.ts`）
- すべての Server Actions は先頭に `"use server"` ディレクティブを含める

## 戻り値形式

- 一貫性のため常に `{ data, error }` オブジェクトを返す
- 成功時: `{ data: T, error: null }`
- 失敗時: `{ data: null, error: string }`
- エラーメッセージはユーザーフレンドリーな日本語で記述する

## エラーハンドリング

### 基本原則

- エラーは適切に処理し、ユーザーフレンドリーなエラーメッセージを日本語で提供する
- デバッグのため `console.error()` でエラーをログ出力する
- 内部エラーの詳細をエンドユーザーに公開しない

### Server Actions での実装

- 複雑な操作には try-catch を使用する
- データベースエラーは `console.error()` でログ出力する
- 適切なエラーメッセージを返す

## データ変更後のキャッシュ無効化

- データ（DB・キャッシュ）を変更する Server Action では、**変更後に `revalidatePath()` で該当パス（または `"layout"`）を無効化する**。一覧と詳細の整合性を保つため

## 参照実装例

- `apps/jobtv/lib/actions/auth-actions.ts`、他 `apps/jobtv/lib/actions/` 配下
