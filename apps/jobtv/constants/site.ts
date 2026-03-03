/**
 * サイト共通の定数定義
 * メタデータ、SEO、URL、SNSアカウントなどの共通設定
 */

// 基本情報
export const SITE_NAME = "JOBTV";
export const SITE_TITLE = "JOBTV - 就活生向け動画情報メディア";
export const SITE_DESCRIPTION =
  "JOBTVは新卒採用をする企業の就活情報を動画で探せるサービスです。企業密着、社員インタビュー、職場見学など、リアルな情報を無料で視聴できます。";

// URL関連
import { getSiteUrl } from "@jobtv-app/shared/utils/dev-config";

// プロトコルなしのサイトURL（環境変数から取得、デフォルトはlocalhost:3000）
const SITE_URL_WITHOUT_PROTOCOL = getSiteUrl(3000);

// プロトコル付きのサイトURL（メタデータなどで使用）
export const SITE_URL = `https://${SITE_URL_WITHOUT_PROTOCOL}`;

// SNSアカウント
export const TWITTER_HANDLE = "@jobtv";
export const TWITTER_SITE = "@jobtv";

// 画像URL（OGP は app/opengraph-image.tsx の動的生成を参照）
export const OGP_IMAGE = `${SITE_URL}/opengraph-image`;
export const LOGO_URL = `${SITE_URL}/logo.svg`;

// SEOキーワード
export const SEO_KEYWORDS = [
  "就活",
  "採用動画",
  "企業説明会",
  "就職活動",
  "新卒採用",
  "転職",
  "キャリア",
  "動画配信",
  "企業紹介"
];

// テーマカラー
export const THEME_COLOR = {
  light: "#ffffff",
  dark: "#000000",
  primary: "#EF4444" // Red-500
} as const;

// PWA設定
export const PWA_CONFIG = {
  name: SITE_TITLE,
  shortName: SITE_NAME,
  description: SITE_DESCRIPTION,
  backgroundColor: THEME_COLOR.light,
  themeColor: THEME_COLOR.light,
  display: "standalone" as const,
  startUrl: "/"
} as const;

// ロボット設定（公開ページ用）
export const ROBOTS_CONFIG = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large" as const,
    "max-snippet": -1
  }
} as const;

/** 管理画面用：検索エンジンにインデックスさせない（studio / admin で使用） */
export const ROBOTS_NOINDEX = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false }
} as const;

// 許可する画像ホスト
export const ALLOWED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "d3ulvrrnhlrak2.cloudfront.net", // サムネ・動画用 CloudFront（STG 等）
  "tdewumilkltljbqryjpg.supabase.co" // Supabase Storage（ロゴ・カバー・サムネ等）
];
