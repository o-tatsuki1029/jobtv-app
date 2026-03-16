import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getS3Client } from "@/lib/aws/s3-singleton";
import { logger } from "@/lib/logger";

/**
 * AWS 認証情報が設定されているか確認。
 * 開発環境などで未設定の場合は false を返し、呼び出し元でスキップできる。
 */
function isS3Available(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

/**
 * S3 オブジェクトを単体削除する。
 * AWS 未設定の場合は warn ログのみ出力してスキップ。
 */
export async function deleteS3Object(
  bucket: string,
  key: string
): Promise<void> {
  if (!isS3Available()) {
    logger.warn(
      { action: "deleteS3Object", bucket, key },
      "AWS認証情報が未設定のためS3削除をスキップしました"
    );
    return;
  }

  try {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );
    logger.info({ action: "deleteS3Object", bucket, key }, "S3オブジェクト削除成功");
  } catch (error) {
    logger.warn(
      { action: "deleteS3Object", bucket, key, err: error },
      "S3オブジェクトの削除に失敗しました"
    );
  }
}

/**
 * S3 プレフィックス配下のオブジェクトを一括削除する。
 * ListObjectsV2 でキーを列挙し、1000 件ずつ DeleteObjects で削除。
 * AWS 未設定の場合は warn ログのみ出力してスキップ。
 */
export async function deleteS3Prefix(
  bucket: string,
  prefix: string
): Promise<void> {
  if (!isS3Available()) {
    logger.warn(
      { action: "deleteS3Prefix", bucket, prefix },
      "AWS認証情報が未設定のためS3削除をスキップしました"
    );
    return;
  }

  try {
    const client = getS3Client();
    let continuationToken: string | undefined;

    do {
      const listResult = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      const objects = listResult.Contents;
      if (!objects || objects.length === 0) break;

      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key! })),
            Quiet: true,
          },
        })
      );

      continuationToken = listResult.IsTruncated
        ? listResult.NextContinuationToken
        : undefined;
    } while (continuationToken);

    logger.info(
      { action: "deleteS3Prefix", bucket, prefix },
      "S3プレフィックス配下を一括削除しました"
    );
  } catch (error) {
    logger.warn(
      { action: "deleteS3Prefix", bucket, prefix, err: error },
      "S3プレフィックス配下の削除に失敗しました"
    );
  }
}
