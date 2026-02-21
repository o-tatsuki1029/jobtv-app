/**
 * (main) ページ用ライト/ダークテーマの Tailwind クラス定数。
 * 企業ページをはじめ (main) 配下でテーマ切り替えに使用する。
 */

export type MainTheme = "light" | "dark";

export interface MainThemeClasses {
  pageBg: string;
  pageText: string;
  sectionBorder: string;
  cardBg: string;
  cardBgHover: string;
  cardBorder: string;
  cardBorderHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sidebarCoverPlaceholder: string;
  stickyBarBg: string;
  stickyBarBorder: string;
  snsButtonBg: string;
  snsButtonBorder: string;
  snsIcon: string;
  videoCardBorder: string;
  videoTitleText: string;
  videoThumbPlaceholder: string;
  jobCardFooterBg: string;
  jobCardFooterBorder: string;
  jobCardFooterText: string;
  descriptionCardBg: string;
  descriptionCardHover: string;
  descriptionCardBorder: string;
  overviewCardBg: string;
  overviewDivide: string;
  overviewLabel: string;
  overviewValue: string;
  linkColor: string;
  benefitsCardBg: string;
  benefitsCardBorderHover: string;
  benefitsIconBg: string;
  benefitsIconColor: string;
  headerVideoBorder: string;
  headerLogoBorder: string;
  logoPlaceholderBg: string;
  logoPlaceholderText: string;
  /** トップページのメインコンテンツエリア背景（バナー・ショート等のブロック） */
  contentAreaBg: string;
  /** トップページのドキュメンタリー等セクション背景・ボーダー */
  contentSectionBg: string;
  contentSectionBorder: string;
  /** 詳細ページのヒーローエリア背景・ボーダー */
  heroSectionBg: string;
  heroSectionBorder: string;
  iconBoxBg: string;
  iconBoxBorder: string;
}

export const MAIN_THEME_CLASSES: Record<MainTheme, MainThemeClasses> = {
  light: {
    pageBg: "bg-gray-50",
    pageText: "text-gray-900",
    sectionBorder: "border-gray-200",
    cardBg: "bg-white",
    cardBgHover: "hover:bg-gray-50",
    cardBorder: "border border-gray-200",
    cardBorderHover: "hover:border-gray-300",
    textPrimary: "text-gray-900",
    textSecondary: "text-gray-700",
    textMuted: "text-gray-500",
    sidebarCoverPlaceholder: "bg-gray-200",
    stickyBarBg: "bg-white/95 backdrop-blur-sm",
    stickyBarBorder: "border-t border-gray-200",
    snsButtonBg: "bg-gray-200",
    snsButtonBorder: "border border-gray-200",
    snsIcon: "text-gray-600",
    videoCardBorder: "border border-gray-200",
    videoTitleText: "text-gray-900",
    videoThumbPlaceholder: "bg-gray-800",
    jobCardFooterBg: "bg-gray-50",
    jobCardFooterBorder: "border-t border-gray-200",
    jobCardFooterText: "text-gray-700",
    descriptionCardBg: "bg-white",
    descriptionCardHover: "hover:bg-gray-50",
    descriptionCardBorder: "border border-gray-200",
    overviewCardBg: "bg-white border border-gray-200",
    overviewDivide: "divide-y divide-gray-200",
    overviewLabel: "text-gray-500",
    overviewValue: "text-gray-700",
    linkColor: "text-blue-600",
    benefitsCardBg: "bg-white border border-gray-200",
    benefitsCardBorderHover: "hover:border-gray-300",
    benefitsIconBg: "bg-red-50",
    benefitsIconColor: "text-red-700",
    headerVideoBorder: "border-y md:border border-gray-200",
    headerLogoBorder: "border border-gray-200",
    logoPlaceholderBg: "bg-gray-100",
    logoPlaceholderText: "text-gray-500",
    contentAreaBg: "bg-gray-50",
    contentSectionBg: "bg-white",
    contentSectionBorder: "border-y border-gray-200",
    heroSectionBg: "bg-white",
    heroSectionBorder: "border-b border-gray-200",
    iconBoxBg: "bg-gray-100",
    iconBoxBorder: "border border-gray-200"
  },
  dark: {
    pageBg: "bg-black",
    pageText: "text-white",
    sectionBorder: "border-gray-800",
    cardBg: "bg-gray-800/50",
    cardBgHover: "hover:bg-gray-800/60",
    cardBorder: "",
    cardBorderHover: "",
    textPrimary: "text-white",
    textSecondary: "text-gray-200",
    textMuted: "text-gray-400",
    sidebarCoverPlaceholder: "bg-gray-800",
    stickyBarBg: "bg-gray-800/30 backdrop-blur-sm",
    stickyBarBorder: "border-t border-gray-800",
    snsButtonBg: "bg-gray-700",
    snsButtonBorder: "border border-gray-600",
    snsIcon: "text-gray-400",
    videoCardBorder: "",
    videoTitleText: "text-white",
    videoThumbPlaceholder: "bg-gray-800",
    jobCardFooterBg: "bg-gray-800/80",
    jobCardFooterBorder: "border-t border-gray-700/50",
    jobCardFooterText: "text-white",
    descriptionCardBg: "bg-gray-800/50",
    descriptionCardHover: "hover:bg-gray-800/70",
    descriptionCardBorder: "",
    overviewCardBg: "bg-gray-800/50",
    overviewDivide: "divide-y divide-gray-800",
    overviewLabel: "text-gray-500",
    overviewValue: "text-gray-200",
    linkColor: "text-blue-400",
    benefitsCardBg: "bg-gray-800/50",
    benefitsCardBorderHover: "",
    benefitsIconBg: "bg-red-500/10",
    benefitsIconColor: "text-red-400",
    headerVideoBorder: "border-y md:border border-gray-800",
    headerLogoBorder: "border border-gray-800",
    logoPlaceholderBg: "bg-gray-100",
    logoPlaceholderText: "text-gray-400",
    contentAreaBg: "bg-gray-900",
    contentSectionBg: "bg-gray-800/70",
    contentSectionBorder: "border-y border-gray-700/50",
    heroSectionBg: "bg-gray-800/50",
    heroSectionBorder: "border-b border-gray-800",
    iconBoxBg: "bg-gray-700",
    iconBoxBorder: "border border-gray-600"
  }
};
