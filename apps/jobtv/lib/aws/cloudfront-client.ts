"use server";

/**
 * CloudFrontのベースURLを取得
 */
function getCloudFrontBaseUrl(): string | null {
  const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;
  if (!cloudFrontUrl) {
    return null;
  }
  // 末尾のスラッシュを削除
  return cloudFrontUrl.replace(/\/$/, "");
}

/**
 * S3キーからCloudFront URLを生成（内部関数）
 * @param s3Key S3オブジェクトキー（例: "source/landscape/companyId/videos/videoId/original.mp4"）
 * @returns CloudFront URL、CloudFrontが設定されていない場合はエラーをスロー
 */
function getCloudFrontUrl(s3Key: string): string {
  const baseUrl = getCloudFrontBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "CloudFrontが設定されていません。AWS_CLOUDFRONT_URL環境変数を設定してください。"
    );
  }
  // S3キーの先頭にスラッシュがない場合は追加
  const key = s3Key.startsWith("/") ? s3Key : `/${s3Key}`;
  return `${baseUrl}${key}`;
}

/**
 * S3 URLをCloudFront URLに変換
 * @param s3Url S3 URL（例: "https://bucket.s3.region.amazonaws.com/key"）
 * @returns CloudFront URL、CloudFrontが設定されていない場合はエラーをスロー
 */
export async function convertS3UrlToCloudFront(s3Url: string): Promise<string> {
  const baseUrl = getCloudFrontBaseUrl();
  if (!baseUrl) {
    throw new Error(
      "CloudFrontが設定されていません。AWS_CLOUDFRONT_URL環境変数を設定してください。"
    );
  }

  // S3 URLからキーを抽出
  // パターン1: https://bucket.s3.region.amazonaws.com/key
  // パターン2: https://bucket.s3-region.amazonaws.com/key
  const s3UrlPattern = /https:\/\/[^/]+\.s3[.-][^/]+\/(.+)$/;
  const match = s3Url.match(s3UrlPattern);

  if (!match || !match[1]) {
    throw new Error(`S3 URLの形式が不正です: ${s3Url}`);
  }

  const s3Key = match[1];
  return getCloudFrontUrl(s3Key);
}

/**
 * HLSマニフェストファイルのCloudFront URLを生成
 * @param companyId 企業ID
 * @param videoId 動画ID
 * @param aspectRatio アスペクト比（landscape または portrait）
 * @returns master.m3u8のCloudFront URL
 */
export async function getHlsManifestUrl(
  companyId: string,
  videoId: string,
  aspectRatio: "landscape" | "portrait"
): Promise<string> {
  const s3Key = `transcoded/${aspectRatio}/${companyId}/videos/${videoId}/hls/master.m3u8`;
  return getCloudFrontUrl(s3Key);
}

