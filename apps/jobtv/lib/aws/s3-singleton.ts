import { S3Client } from "@aws-sdk/client-s3";

const globalForS3 = globalThis as unknown as { __s3Client?: S3Client };

/**
 * S3クライアントのシングルトンインスタンスを取得。
 * "use server" ファイルではないため、他のサーバーモジュールから自由にインポート可能。
 */
export function getS3Client(): S3Client {
  if (globalForS3.__s3Client) return globalForS3.__s3Client;

  const region = process.env.AWS_REGION || "ap-northeast-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS認証情報が設定されていません。AWS_ACCESS_KEY_IDとAWS_SECRET_ACCESS_KEYを環境変数に設定してください。"
    );
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  globalForS3.__s3Client = client;
  return client;
}
