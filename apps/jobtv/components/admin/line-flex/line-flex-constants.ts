/** LINE Flex Message Simulator 準拠のデザイントークン */

export const FLEX_TEXT_SIZE: Record<string, number> = {
  xxs: 10,
  xs: 12,
  sm: 13,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  "3xl": 24,
  "4xl": 28,
  "5xl": 32,
};

export const FLEX_SPACING: Record<string, number> = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
};

export const LINE_GREEN = "#06C755";
export const CHAT_BG = "#7494AA";
export const OFFICIAL_BUBBLE_BG = "#D4F4DD";
export const DEFAULT_TEXT_COLOR = "#111111";
export const SECONDARY_TEXT_COLOR = "#999999";
export const BUBBLE_MAX_WIDTH = 300;
export const BUBBLE_BORDER_RADIUS = 16;
export const BUTTON_BORDER_RADIUS = 8;

/** LINE のキーワード or "Npx" 形式を CSS px 値に解決 */
export function resolvePx(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // "20px" 形式
  if (value.endsWith("px")) return value;
  // キーワード
  if (FLEX_SPACING[value] !== undefined) return `${FLEX_SPACING[value]}px`;
  // 数値文字列
  const n = parseFloat(value);
  if (!isNaN(n)) return `${n}px`;
  return undefined;
}

/** テキストサイズのキーワード or "Npx" を px 数値に */
export function resolveTextSize(value: string | undefined): number {
  if (!value) return FLEX_TEXT_SIZE.md;
  if (FLEX_TEXT_SIZE[value] !== undefined) return FLEX_TEXT_SIZE[value];
  if (value.endsWith("px")) {
    const n = parseFloat(value);
    if (!isNaN(n)) return n;
  }
  return FLEX_TEXT_SIZE.md;
}
