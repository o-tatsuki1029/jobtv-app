/**
 * 横スクロールカード（企業カード・就活Shorts・バナー等）のレイアウト定数。
 * 横幅はセクション側で指定し、縦はアスペクト比で決める。共通化のため定数で管理する。
 */

/** カードサムネの縦横比（幅:高さ = 5:7）。Tailwind の aspect クラス用。 */
export const HORIZONTAL_CARD_ASPECT_RATIO_CLASS = "aspect-[5/7]" as const;

/** カードサムネの縦横比（幅:高さ = 16:9）。バナー等の横長カード用。 */
export const HORIZONTAL_CARD_ASPECT_RATIO_16_9_CLASS = "aspect-[16/9]" as const;

/**
 * 横スクロールセクションで使うカード幅の Tailwind クラス。
 * ラッパーまたはカードに指定し、カード内のサムネはアスペクト比クラスで高さを決める。
 */
export const HORIZONTAL_CARD_WIDTH = {
  /** 企業カード（CompanySection） */
  company: "w-[160px] sm:w-[180px] md:w-[200px]" as const,
  /** 就活Shorts（ShortVideoSection） */
  shortVideo: "w-[160px] sm:w-[180px] md:w-[200px]" as const,
  /** バナー（BannerList） */
  banner: "w-[250px] sm:w-[300px] md:w-[350px]" as const,
  /** 企業ページ動画（CompanyVideos・ドキュメンタリー等 16:9） */
  video: "w-[250px] sm:w-[300px] md:w-[350px]" as const
} as const;
