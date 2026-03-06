/**
 * 開発環境用の設定を統一管理
 * 各アプリで共通して使用する開発環境用の設定をここに集約
 */

/**
 * 開発環境用のTLS証明書検証を無効化
 * Zero Trustチェックをスキップする場合に使用
 */
export function configureDevelopmentTLS() {
  const skipZeroTrustCheck =
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_ZEROTRUST_CHECK === "true";

  if (skipZeroTrustCheck && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

/**
 * Zero Trustチェックをスキップするかどうかを判定
 */
export function shouldSkipZeroTrustCheck(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_ZEROTRUST_CHECK === "true"
  );
}

/**
 * サイトURLを取得（プロトコルなし）
 * 環境変数が設定されていない場合はデフォルト値を返す
 */
export function getSiteUrl(port: number): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    // プロトコルが含まれている場合は削除
    return siteUrl.replace(/^https?:\/\//, "");
  }
  return `localhost:${port}`;
}

/**
 * 完全なサイトURLを取得（プロトコル付き）
 * 認証コールバックなどで使用
 * localhost以外は自動的にhttpsを使用する
 */
export function getFullSiteUrl(port: number): string {
  const siteUrl = getSiteUrl(port);
  const isLocalhost = siteUrl.startsWith("localhost");
  const protocol = isLocalhost ? "http" : "https";
  return `${protocol}://${siteUrl}`;
}
