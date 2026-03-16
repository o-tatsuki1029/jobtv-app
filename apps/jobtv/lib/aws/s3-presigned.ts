"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client } from "@/lib/aws/s3-singleton";
import { logger } from "@/lib/logger";

const PRESIGNED_URL_EXPIRES_IN = 900; // 15分

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo"
];

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * 動画アップロード用の Presigned URL を生成
 */
export async function createVideoPresignedUrl(params: {
  s3Key: string;
  contentType: string;
  fileSize: number;
  metadata?: Record<string, string>;
}): Promise<{
  presignedUrl: string | null;
  error: string | null;
}> {
  try {
    // バリデーション
    if (!ALLOWED_VIDEO_TYPES.includes(params.contentType)) {
      return {
        presignedUrl: null,
        error: "サポートされていないファイル形式です。動画（MP4, WebM, MOV, AVI）をアップロードしてください。"
      };
    }

    if (params.fileSize > MAX_VIDEO_SIZE) {
      return {
        presignedUrl: null,
        error: "ファイルサイズは500MB以下である必要があります"
      };
    }

    const bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    const client = getS3Client();

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: params.s3Key,
      ContentType: params.contentType,
      ContentLength: params.fileSize,
      ...(params.metadata && { Metadata: params.metadata })
    });

    const presignedUrl = await getSignedUrl(client, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN
    });

    logger.info(
      { action: "createVideoPresignedUrl", s3Key: params.s3Key },
      "Presigned URL生成成功"
    );

    return { presignedUrl, error: null };
  } catch (error) {
    logger.error(
      { action: "createVideoPresignedUrl", s3Key: params.s3Key, err: error },
      "Presigned URL生成失敗"
    );
    return {
      presignedUrl: null,
      error: error instanceof Error ? error.message : "Presigned URLの生成に失敗しました"
    };
  }
}
