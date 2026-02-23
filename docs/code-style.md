# コーディング規約

このドキュメントは、ファイル命名・型・コメント・インポートに関する開発者向けの規約の正本です。

---

## ファイル命名規則

### 命名規則

- コンポーネント: PascalCase（例: `CandidateForm.tsx`）
- ユーティリティ: kebab-case（例: `candidate-utils.ts`）
- Actions: kebab-case で `-actions.ts` サフィックス（例: `candidate-actions.ts`）
- 型定義: kebab-case で `.types.ts` サフィックス（例: `database.types.ts`）
- ページ: Next.js App Router の規約に従う（例: `page.tsx`, `layout.tsx`）

## 型安全性の確保

### 型の使用ルール

- データベースエンティティには常に型定義を使用する（`@/types` または `@jobtv-app/shared/types` から）
- データベース型から `Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>` を使用する
- コンポーネントの props には interface/type を定義する
- `any` 型を避け、型が不明な場合は `unknown` を使用する

## コメントとドキュメント

### コメントの記述ルール

- 複雑な関数やビジネスロジックには JSDoc コメントを追加する
- Server Actions には日本語で機能説明を追加する
- 非自明な処理にはインラインコメントを追加する
- 型定義が複雑な場合はコメントで補足する

## インポートの整理

### インポートの順序

- 外部ライブラリのインポートを最初に記述
- 内部モジュール（`@/` エイリアス）のインポートを次に記述
- 相対パスは最小限にし、`@/` エイリアスを優先して使用
- 型インポートには `import type` を使用する
