# UI・スタイリング規約

このドキュメントは、Tailwind CSS、コンポーネント分類・配置、データフェッチ、ページテーマに関する開発者向けの規約の正本です。

---

## Tailwind CSS

### レイアウト

- レイアウトには `flex` と `gap` を組み合わせて使用する
- `margin` によるスペーシングは避け、`gap` を優先する
- 複数列レイアウトには `grid` を使用する

### スペーシング

- スペーシングには Tailwind の標準スケール（4px ベース）を使用し、一貫性を保つ
- `gap-1` から `gap-12` の標準スケールを優先する
- カスタム値（`w-[123px]` など）は最小限に

### レスポンシブデザイン

- モバイルファーストで設計し、必要に応じてブレークポイント（`sm:`, `md:`, `lg:`, `xl:`, `2xl:`）で調整する
- レスポンシブクラスは `md:`, `lg:` などを使用して段階的に適用する

### カラー・タイポグラフィ・ボーダー

- プロジェクトで定義されたカラーパレットを使用し、一貫性を保つ。グレースケールは `gray-50` から `gray-900`。透明度は `/30`, `/50`, `/80` などの Tailwind 記法を使用
- テキストサイズとウェイトを統一する。見出しは `text-lg md:text-xl font-bold`、本文は `text-sm md:text-base`
- 角丸とボーダーを統一する。カードには `rounded-lg`、ボタンには `rounded-md`。ボーダーは `border border-gray-800` などの統一スタイル

### クラス順序・ユーティリティ

- クラスの順序: レイアウト → 配置 → サイズ → スペーシング → タイポグラフィ → カラー → 装飾 → エフェクト
- 条件付きクラスには `cn()` ユーティリティ（clsx + tailwind-merge）を使用する
- 共通のスタイルパターンはコンポーネント化し、クラスの重複を避ける

### 横スクロールカードのレイアウト定数

- 横スクロールセクションのカード（企業カード・就活Shorts・バナー等）は、**横幅を定数で指定し、縦はアスペクト比で決める**
- 縦横比と横幅の Tailwind クラスは `@/constants/card-layout`（jobtv では `apps/jobtv/constants/card-layout`）で共通化する
- アスペクト比: `HORIZONTAL_CARD_ASPECT_RATIO_CLASS`（5:7）、`HORIZONTAL_CARD_ASPECT_RATIO_16_9_CLASS`（16:9）
- 横幅: `HORIZONTAL_CARD_WIDTH.company` / `shortVideo` / `banner` / `video` など。新規に同種カードを追加する場合は定数を追加し、コンポーネントでは定数を参照する

### フォント設定（Tailwind v4 + next/font）

全アプリで **Inter**（欧文）+ **Noto Sans JP**（日本語）を Web フォントとして使用し、環境間のフォント差異をなくしている。欧文は Inter が処理し、日本語は Noto Sans JP にフォールバックする。

#### 構成パターン

1. **layout.tsx**: `next/font/google` から `Inter` と `Noto_Sans_JP` をインポートし、CSS 変数を生成。**クラスは `<html>` に付与する**（`<body>` ではない）
2. **globals.css**: `:root` に `--default-font-family` を設定（Inter → Noto Sans JP の順）

```tsx
// layout.tsx
import { Inter, Noto_Sans_JP } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
});

// <html> に付与（<body> ではない）
<html className={`${inter.variable} ${notoSansJP.variable}`}>
```

```css
/* globals.css */
:root {
  --default-font-family: var(--font-inter), var(--font-noto-sans-jp), sans-serif;
}
```

#### 注意点

- **CSS 変数のスコープ**: `next/font` は指定要素にのみ CSS 変数を定義する。Tailwind v4 の preflight は `html` の `--default-font-family` を参照するため、フォント変数クラスは必ず `<html>` に付与すること。`<body>` に付けると `:root`（= `html`）から変数が見えず、フォールバックフォントが使われる
- **`@theme inline` の `--font-sans`**: Tailwind v4 では `@theme inline { --font-sans: ... }` だけでは preflight の `font-family` に反映されない。`:root` で `--default-font-family` を明示的に設定する必要がある
- **Mono フォント**: Web フォントは使わず、システム mono フォント（`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`）を使用

### アクセシビリティ・禁止事項

- フォーカス状態・スクリーンリーダー対応など、アクセシビリティを考慮したクラスを使用する
- インラインスタイルは必要な場合を除き避ける。`!important` は避ける。ネガティブマージンは最小限に。クラス名が長すぎる場合はコンポーネント化を検討する

---

## コンポーネント

### 分類

- **Server Components**: デフォルト（`"use client"` 不要）
- **Client Components**: 先頭に `"use client"` を必須で含める。インタラクティブな機能（useState、useEffect、イベントハンドラなど）が必要な場合のみ使用する

### 配置・命名

- 共有 UI コンポーネント: `components/ui/` に配置
- 機能固有のコンポーネント: `components/` に説明的な名前で配置
- コンポーネント命名: PascalCase（例: `CandidateForm.tsx`）

---

## データフェッチ

- **Server Components**: Server Actions または Supabase クライアントで直接データを取得する
- **Client Components**: 変更には Server Actions を使用し、初期データは props 経由で取得する。必要な場合を除き、Client でのデータ取得は避ける
- すべての変更操作（作成・更新・削除）には Server Actions を使用する

---

## ページテーマ（jobtv）

### 定義場所

- **定数**: `apps/jobtv/constants/page-theme.ts`
  - `MainTheme` 型（"light" | "dark"）
  - `MainThemeClasses` 型と `MAIN_THEME_CLASSES`（light/dark ごとの Tailwind クラス）
- **Context**: `apps/jobtv/components/theme/PageThemeContext.tsx`
  - `MainThemeProvider`: テーマを配下に提供
  - `useMainTheme()`: theme, setTheme, classes, hasHeader を取得

### 記述方針

- 定数ファイル内は**役割（背景・テキスト・ボーダー等）ごとにブロック分け**する。背景 → テキスト → ボーダー → その他の順。新規クラスは `MainThemeClasses` と light/dark の両方に追加する

### 利用箇所

- **MainThemeProvider** を使用するレイアウト・ページ: `(main)` レイアウト（MainLayoutClient）、studio のプレビュー（企業・求人・説明会）
- テーマに依存するコンポーネントは `useMainTheme()` で `classes` を取得し、`classes.xxx` で Tailwind クラスを適用する
