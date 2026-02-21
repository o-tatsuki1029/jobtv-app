/**
 * メインヘッダー（HeaderContainer）の高さに関する定数。
 * 追従サイドバーの top やスクロールオフセット計算で参照する。
 */

/** モバイル時のヘッダー高さ（px）。h-16 = 4rem = 64px */
export const HEADER_HEIGHT_PX_MOBILE = 64;

/** デスクトップ（md以上）時のヘッダー高さ（px）。h-18 = 4.5rem = 72px */
export const HEADER_HEIGHT_PX_DESKTOP = 72;

/** ヘッダー要素の高さ用 Tailwind クラス */
export const HEADER_HEIGHT_CLASS = "h-16 md:h-18";

/** ヘッダーありのときの追従サイドバー用 top（ヘッダー高さ + 余白）。5.5rem = 88px */
export const STICKY_SIDEBAR_TOP_WITH_HEADER_CLASS = "top-[5.5rem]";

/** ヘッダーありのときの追従サイドバー用 top（lg ブレークポイント付き）。企業ページサイドバー用 */
export const STICKY_SIDEBAR_TOP_WITH_HEADER_CLASS_LG = "lg:top-[5.5rem]";

/** ヘッダーなし（プレビュー等）のときの追従サイドバー用 top */
export const STICKY_SIDEBAR_TOP_WITHOUT_HEADER_CLASS = "top-5";

/** ヘッダーなしのときの追従サイドバー用 top（lg ブレークポイント付き） */
export const STICKY_SIDEBAR_TOP_WITHOUT_HEADER_CLASS_LG = "lg:top-5";
