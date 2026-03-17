"use server";

import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "@/lib/logger";

/**
 * S3メタデータ用の32桁英数字（0-9a-f）を生成。x-amz-meta-* はASCIIのみ許容のため使用。
 */
function randomAlphanumeric32(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * CloudFrontのベースURLを取得（内部関数）
 */
function getCloudFrontBaseUrl(): string {
  const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;
  if (!cloudFrontUrl) {
    throw new Error("CloudFrontが設定されていません。AWS_CLOUDFRONT_URL環境変数を設定してください。");
  }
  // 末尾のスラッシュを削除
  return cloudFrontUrl.replace(/\/$/, "");
}

/**
 * S3キーからCloudFront URLを生成（内部関数）
 */
function getCloudFrontUrl(s3Key: string): string {
  const baseUrl = getCloudFrontBaseUrl();
  // S3キーの先頭にスラッシュがない場合は追加
  const key = s3Key.startsWith("/") ? s3Key : `/${s3Key}`;
  return `${baseUrl}${key}`;
}

import { getS3Client } from "@/lib/aws/s3-singleton";

/**
 * S3にファイルをアップロード
 */
export async function uploadToS3(
  bucket: string,
  key: string,
  file: File | Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<{
  success: boolean;
  key?: string;
  url?: string;
  error?: string;
}> {
  try {
    const s3Client = getS3Client();

    // Fileオブジェクトの場合はArrayBufferに変換
    let body: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      body = Buffer.from(arrayBuffer);
    } else {
      body = file;
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(metadata && { Metadata: metadata })
    });

    await s3Client.send(command);

    // 公開URLを生成（バケットが公開されている場合）
    const url = `https://${bucket}.s3.${process.env.AWS_REGION || "ap-northeast-1"}.amazonaws.com/${key}`;

    return {
      success: true,
      key,
      url
    };
  } catch (error) {
    logger.error({ action: "uploadToS3", key, err: error }, "S3アップロード失敗");
    return {
      success: false,
      error: error instanceof Error ? error.message : "S3アップロードに失敗しました"
    };
  }
}

/**
 * 動画ファイルをS3にアップロード（専用関数）
 */
export async function uploadVideoToS3(
  file: File,
  companyId: string,
  videoId: string
): Promise<{
  data: { s3Key: string; url: string; s3Url: string } | null;
  error: string | null;
}> {
  try {
    const bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    if (!bucket) {
      return {
        data: null,
        error: "AWS_S3_BUCKETが設定されていません"
      };
    }

    // ファイル拡張子を取得
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const s3Key = `companies/${companyId}/videos/${videoId}/original.${fileExt}`;
    logger.info({ action: "uploadVideoToS3", videoId, companyId, s3Key }, "動画S3アップロード開始");

    // ファイルサイズチェック（50MB以下）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        data: null,
        error: "ファイルサイズは50MB以下である必要があります"
      };
    }

    // MIMEタイプチェック
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    if (!allowedVideoTypes.includes(file.type)) {
      return {
        data: null,
        error: "サポートされていないファイル形式です。動画（MP4, WebM, MOV, AVI）をアップロードしてください。"
      };
    }

    const result = await uploadToS3(bucket, s3Key, file, file.type, {
      companyId,
      videoId,
      originalFileName: randomAlphanumeric32(),
      uploadedAt: new Date().toISOString()
    });

    if (!result.success) {
      logger.error({ action: "uploadVideoToS3", videoId, companyId, s3Key }, "動画S3アップロード失敗");
      return {
        data: null,
        error: result.error || "動画のアップロードに失敗しました"
      };
    }

    // CloudFront URLを生成（必須）
    try {
      const cloudFrontUrl = getCloudFrontUrl(result.key!);
      logger.info({ action: "uploadVideoToS3", videoId, companyId, s3Key: result.key }, "動画S3アップロード成功");
      return {
        data: {
          s3Key: result.key!,
          url: cloudFrontUrl, // CloudFront URL
          s3Url: result.url! // 元のS3 URLも保持（参考用）
        },
        error: null
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "CloudFront URLの生成に失敗しました";
      logger.error({ action: "uploadVideoToS3", videoId, companyId, err: error }, "CloudFront URL生成失敗");
      return {
        data: null,
        error: msg
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "動画のアップロードに失敗しました";
    logger.error({ action: "uploadVideoToS3", videoId, companyId, err: error }, "動画S3アップロード失敗");
    return {
      data: null,
      error: msg
    };
  }
}

/**
 * ヒーロー動画ファイルをS3にアップロード（専用関数）
 */
export async function uploadHeroVideoToS3(
  file: File,
  heroItemId: string
): Promise<{
  data: { s3Key: string } | null;
  error: string | null;
}> {
  try {
    const bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const s3Key = `admin/hero-items/${heroItemId}/original.${fileExt}`;
    logger.info({ action: "uploadHeroVideoToS3", heroItemId, s3Key }, "ヒーロー動画S3アップロード開始");

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return { data: null, error: "ファイルサイズは500MB以下である必要があります" };
    }

    const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!allowedVideoTypes.includes(file.type)) {
      return {
        data: null,
        error: "サポートされていないファイル形式です。動画（MP4, WebM, MOV）をアップロードしてください。"
      };
    }

    const result = await uploadToS3(bucket, s3Key, file, file.type, {
      heroItemId,
      originalFileName: randomAlphanumeric32(),
      uploadedAt: new Date().toISOString()
    });

    if (!result.success) {
      logger.error({ action: "uploadHeroVideoToS3", heroItemId, s3Key }, "ヒーロー動画S3アップロード失敗");
      return { data: null, error: result.error || "動画のアップロードに失敗しました" };
    }

    logger.info({ action: "uploadHeroVideoToS3", heroItemId, s3Key: result.key }, "ヒーロー動画S3アップロード成功");
    return { data: { s3Key: result.key! }, error: null };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "動画のアップロードに失敗しました";
    logger.error({ action: "uploadHeroVideoToS3", heroItemId, err: error }, "ヒーロー動画S3アップロード失敗");
    return { data: null, error: msg };
  }
}

/**
 * サムネイル画像をS3にアップロード
 */
export async function uploadThumbnailToS3(
  file: File,
  companyId: string,
  videoId: string
): Promise<{
  data: { s3Key: string; url: string; s3Url: string } | null;
  error: string | null;
}> {
  try {
    const bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    if (!bucket) {
      return {
        data: null,
        error: "AWS_S3_BUCKETが設定されていません"
      };
    }

    // ファイル拡張子を取得
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const s3Key = `companies/${companyId}/videos/${videoId}/thumbnail.${fileExt}`;

    // ファイルサイズチェック（10MB以下）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        data: null,
        error: "ファイルサイズは10MB以下である必要があります"
      };
    }

    // MIMEタイプチェック
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedImageTypes.includes(file.type)) {
      return {
        data: null,
        error: "サポートされていないファイル形式です。画像（JPEG, PNG, WebP, GIF）をアップロードしてください。"
      };
    }

    const result = await uploadToS3(bucket, s3Key, file, file.type, {
      companyId,
      videoId,
      originalFileName: randomAlphanumeric32(),
      uploadedAt: new Date().toISOString()
    });

    if (!result.success) {
      return {
        data: null,
        error: result.error || "サムネイルのアップロードに失敗しました"
      };
    }

    // CloudFront URLを生成（必須）
    try {
      const cloudFrontUrl = getCloudFrontUrl(result.key!);
      return {
        data: {
          s3Key: result.key!,
          url: cloudFrontUrl, // CloudFront URL
          s3Url: result.url! // 元のS3 URLも保持（参考用）
        },
        error: null
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "CloudFront URLの生成に失敗しました"
      };
    }
  } catch (error) {
    logger.error({ action: "uploadThumbnailToS3", companyId, videoId, err: error }, "サムネイルS3アップロード失敗");
    return {
      data: null,
      error: error instanceof Error ? error.message : "サムネイルのアップロードに失敗しました"
    };
  }
}
