/**
 * (main) 配下のライト/ダークページテーマ用 Tailwind クラス定数。
 * トップページ・企業ページ・求人・説明会詳細など、(main) 配下のテーマ切り替えに使用する。
 * 定義は役割（背景・テキスト・ボーダー等）ごとにブロック分けしている。
 */

export type MainTheme = "light" | "dark";

export interface MainThemeClasses {
  /* ----- 背景 ----- */
  pageBg: string;
  pageText: string;
  contentAreaBg: string;
  contentSectionBg: string;
  heroSectionBg: string;
  cardBg: string;
  cardBgHover: string;
  stickyBarBg: string;
  descriptionCardBg: string;
  descriptionCardHover: string;
  overviewCardBg: string;
  benefitsCardBg: string;
  benefitsIconBg: string;
  iconBoxBg: string;
  logoPlaceholderBg: string;
  sidebarCoverPlaceholder: string;
  jobCardFooterBg: string;
  videoThumbPlaceholder: string;
  bannerListBg: string;

  /* ----- テキスト ----- */
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  linkColor: string;
  videoTitleText: string;
  jobCardFooterText: string;
  overviewLabel: string;
  overviewValue: string;
  benefitsIconColor: string;
  logoPlaceholderText: string;

  /* ----- ボーダー ----- */
  sectionBorder: string;
  cardBorder: string;
  cardBorderHover: string;
  stickyBarBorder: string;
  contentSectionBorder: string;
  heroSectionBorder: string;
  headerVideoBorder: string;
  headerLogoBorder: string;
  descriptionCardBorder: string;
  benefitsCardBorderHover: string;
  iconBoxBorder: string;
  jobCardFooterBorder: string;
  videoCardBorder: string;

  /* ----- その他（区切り・SNS等） ----- */
  overviewDivide: string;
  snsButtonBg: string;
  snsButtonBorder: string;
  snsIcon: string;
}

export const MAIN_THEME_CLASSES: Record<MainTheme, MainThemeClasses> = {
  light: {
    /* ----- 背景 ----- */
    pageBg: "bg-gray-50",
    pageText: "text-gray-900",
    contentAreaBg: "bg-gray-50",
    contentSectionBg: "bg-white",
    heroSectionBg: "bg-white",
    cardBg: "bg-white",
    cardBgHover: "hover:bg-gray-50",
    stickyBarBg: "bg-white/95 backdrop-blur-sm",
    descriptionCardBg: "bg-white",
    descriptionCardHover: "hover:bg-gray-50",
    overviewCardBg: "bg-white border border-gray-200",
    benefitsCardBg: "bg-white border border-gray-200",
    benefitsIconBg: "bg-red-50",
    iconBoxBg: "bg-gray-100",
    logoPlaceholderBg: "bg-gray-100",
    sidebarCoverPlaceholder: "bg-gray-200",
    jobCardFooterBg: "bg-gray-50",
    videoThumbPlaceholder: "bg-gray-800",
    bannerListBg: "bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,_#eee_0%,_#ddd_100%)]",

    /* ----- テキスト ----- */
    textPrimary: "text-gray-900",
    textSecondary: "text-gray-700",
    textMuted: "text-gray-500",
    linkColor: "text-blue-600",
    videoTitleText: "text-gray-900",
    jobCardFooterText: "text-gray-700",
    overviewLabel: "text-gray-500",
    overviewValue: "text-gray-700",
    benefitsIconColor: "text-red-700",
    logoPlaceholderText: "text-gray-500",

    /* ----- ボーダー ----- */
    sectionBorder: "border-gray-200",
    cardBorder: "border border-gray-200",
    cardBorderHover: "hover:border-gray-300",
    stickyBarBorder: "border-t border-gray-200",
    contentSectionBorder: "border-y border-gray-200",
    heroSectionBorder: "border-b border-gray-200",
    headerVideoBorder: "border-y md:border border-gray-200",
    headerLogoBorder: "border border-gray-200",
    descriptionCardBorder: "border border-gray-200",
    benefitsCardBorderHover: "hover:border-gray-300",
    iconBoxBorder: "border border-gray-200",
    jobCardFooterBorder: "border-t border-gray-200",
    videoCardBorder: "border border-gray-200",

    /* ----- その他 ----- */
    overviewDivide: "divide-y divide-gray-200",
    snsButtonBg: "bg-gray-200",
    snsButtonBorder: "border border-gray-200",
    snsIcon: "text-gray-600"
  },
  dark: {
    /* ----- 背景 ----- */
    pageBg: "bg-black",
    pageText: "text-white",
    contentAreaBg: "bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,_#111827_0%,_#000_100%)]",
    contentSectionBg: "bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,_#111827_0%,_#000_100%)]",
    heroSectionBg: "bg-gray-800/50",
    cardBg: "bg-gray-800/50",
    cardBgHover: "hover:bg-gray-800/60",
    stickyBarBg: "bg-gray-800/30 backdrop-blur-sm",
    descriptionCardBg: "bg-gray-800/50",
    descriptionCardHover: "hover:bg-gray-800/70",
    overviewCardBg: "bg-gray-800/50",
    benefitsCardBg: "bg-gray-800/50",
    benefitsIconBg: "bg-red-500/10",
    iconBoxBg: "bg-gray-700",
    logoPlaceholderBg: "bg-gray-100",
    sidebarCoverPlaceholder: "bg-gray-800",
    jobCardFooterBg: "bg-gray-800/80",
    videoThumbPlaceholder: "bg-gray-800",
    bannerListBg: "bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,_#111827_0%,_#000_100%)]",

    /* ----- テキスト ----- */
    textPrimary: "text-white",
    textSecondary: "text-gray-200",
    textMuted: "text-gray-400",
    linkColor: "text-blue-400",
    videoTitleText: "text-white",
    jobCardFooterText: "text-white",
    overviewLabel: "text-gray-500",
    overviewValue: "text-gray-200",
    benefitsIconColor: "text-red-400",
    logoPlaceholderText: "text-gray-400",

    /* ----- ボーダー ----- */
    sectionBorder: "border-gray-800",
    cardBorder: "",
    cardBorderHover: "",
    stickyBarBorder: "border-t border-gray-800",
    contentSectionBorder: "border-y border-gray-700/50",
    heroSectionBorder: "border-b border-gray-800",
    headerVideoBorder: "border-y md:border border-gray-800",
    headerLogoBorder: "border border-gray-800",
    descriptionCardBorder: "",
    benefitsCardBorderHover: "",
    iconBoxBorder: "border border-gray-600",
    jobCardFooterBorder: "border-t border-gray-700/50",
    videoCardBorder: "",

    /* ----- その他 ----- */
    overviewDivide: "divide-y divide-gray-800",
    snsButtonBg: "bg-gray-700",
    snsButtonBorder: "border border-gray-600",
    snsIcon: "text-gray-400"
  }
};
