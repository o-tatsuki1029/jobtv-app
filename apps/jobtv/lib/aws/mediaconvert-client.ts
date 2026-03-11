"use server";

import { MediaConvertClient, CreateJobCommand, GetJobCommand } from "@aws-sdk/client-mediaconvert";
import { logger } from "@/lib/logger";

/**
 * MediaConvertクライアントを作成（内部関数）
 */
function createMediaConvertClient() {
  const region = process.env.AWS_REGION || "ap-northeast-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS認証情報が設定されていません。AWS_ACCESS_KEY_IDとAWS_SECRET_ACCESS_KEYを環境変数に設定してください。"
    );
  }

  return new MediaConvertClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });
}

/**
 * MediaConvertジョブの設定
 */
export interface MediaConvertJobConfig {
  videoId: string;
  companyId: string;
  sourceS3Key: string;
  aspectRatio: "landscape" | "portrait";
}

/**
 * MediaConvertジョブを作成
 */
export async function createMediaConvertJob(config: MediaConvertJobConfig): Promise<{
  jobId?: string;
  error?: string;
}> {
  try {
    logger.info({ action: "createMediaConvertJob", videoId: config.videoId, sourceS3Key: config.sourceS3Key }, "MediaConvertジョブ作成開始");
    const client = createMediaConvertClient();
    const bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN;
    const templateLandscape = process.env.AWS_MEDIACONVERT_TEMPLATE_LANDSCAPE;
    const templatePortrait = process.env.AWS_MEDIACONVERT_TEMPLATE_PORTRAIT;

    if (!roleArn) {
      logger.error({ action: "createMediaConvertJob", videoId: config.videoId }, "AWS_MEDIACONVERT_ROLE_ARNが未設定");
      return { error: "AWS_MEDIACONVERT_ROLE_ARNが設定されていません" };
    }

    const templateArn = config.aspectRatio === "portrait" ? templatePortrait : templateLandscape;

    if (!templateArn) {
      logger.error({ action: "createMediaConvertJob", videoId: config.videoId, aspectRatio: config.aspectRatio }, "MediaConvertテンプレートARNが未設定");
      return {
        error: `AWS_MEDIACONVERT_TEMPLATE_${config.aspectRatio.toUpperCase()}が設定されていません`
      };
    }

    // SNSトピックARNを取得（オプション）
    const snsTopicArn = process.env.AWS_SNS_TOPIC_ARN;

    // 出力先を設定
    const destinationS3Key = `companies/${config.companyId}/videos/${config.videoId}/hls/${config.aspectRatio}/`;

    // テンプレートを使用する場合、入力ファイルと出力先のみを上書き
    const jobSettings: any = {
      Role: roleArn,
      JobTemplate: templateArn,
      Settings: {
        Inputs: [
          {
            FileInput: `s3://${bucket}/${config.sourceS3Key}`
          }
        ],
        OutputGroups: [
          {
            Name: "Apple HLS",
            OutputGroupSettings: {
              Type: "HLS_GROUP_SETTINGS" as const,
              HlsGroupSettings: {
                Destination: `s3://${bucket}/${destinationS3Key}`
              }
            }
          },
          {
            Name: "File Group",
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS" as const,
              FileGroupSettings: {
                Destination: `s3://${bucket}/${destinationS3Key}`
              }
            }
          }
        ]
      },
      UserMetadata: {
        videoId: config.videoId,
        companyId: config.companyId,
        aspectRatio: config.aspectRatio,
        sourceKey: config.sourceS3Key
      },
      StatusUpdateInterval: "SECONDS_60" as const
    };

    // SNS通知設定（設定されている場合）
    if (snsTopicArn) {
      jobSettings.EventNotification = {
        CompleteTopicArn: snsTopicArn,
        ErrorTopicArn: snsTopicArn
      };
    }

    const command = new CreateJobCommand(jobSettings);
    const response = await client.send(command);

    if (!response.Job?.Id) {
      logger.error({ action: "createMediaConvertJob", videoId: config.videoId }, "MediaConvertジョブIDがレスポンスに含まれていない");
      return { error: "ジョブの作成に失敗しました" };
    }

    logger.info({ action: "createMediaConvertJob", videoId: config.videoId, jobId: response.Job.Id }, "MediaConvertジョブ作成成功");
    return { jobId: response.Job.Id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ジョブの作成に失敗しました";
    logger.error({ action: "createMediaConvertJob", videoId: config.videoId, err: error }, "MediaConvertジョブ作成失敗");
    return {
      error: msg
    };
  }
}

/**
 * ヒーローアイテム用MediaConvertジョブを作成（landscape固定）
 */
export async function createHeroMediaConvertJob(
  heroItemId: string,
  sourceS3Key: string
): Promise<{ jobId?: string; error?: string }> {
  try {
    logger.info({ action: "createHeroMediaConvertJob", heroItemId, sourceS3Key }, "ヒーローMediaConvertジョブ作成開始");
    const client = createMediaConvertClient();
    const bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN;
    const templateArn = process.env.AWS_MEDIACONVERT_TEMPLATE_LANDSCAPE;

    if (!roleArn) {
      logger.error({ action: "createHeroMediaConvertJob", heroItemId }, "AWS_MEDIACONVERT_ROLE_ARNが未設定");
      return { error: "AWS_MEDIACONVERT_ROLE_ARNが設定されていません" };
    }
    if (!templateArn) {
      logger.error({ action: "createHeroMediaConvertJob", heroItemId }, "AWS_MEDIACONVERT_TEMPLATE_LANDSCAPEが未設定");
      return { error: "AWS_MEDIACONVERT_TEMPLATE_LANDSCAPEが設定されていません" };
    }

    const snsTopicArn = process.env.AWS_SNS_TOPIC_ARN;
    const destinationS3Key = `admin/hero-items/${heroItemId}/hls/landscape/`;

    const jobSettings: any = {
      Role: roleArn,
      JobTemplate: templateArn,
      Settings: {
        Inputs: [
          {
            FileInput: `s3://${bucket}/${sourceS3Key}`
          }
        ],
        OutputGroups: [
          {
            Name: "Apple HLS",
            OutputGroupSettings: {
              Type: "HLS_GROUP_SETTINGS" as const,
              HlsGroupSettings: {
                Destination: `s3://${bucket}/${destinationS3Key}`
              }
            }
          },
          {
            Name: "File Group",
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS" as const,
              FileGroupSettings: {
                Destination: `s3://${bucket}/${destinationS3Key}`
              }
            }
          }
        ]
      },
      UserMetadata: {
        heroItemId,
        aspectRatio: "landscape",
        sourceKey: sourceS3Key
      },
      StatusUpdateInterval: "SECONDS_60" as const
    };

    if (snsTopicArn) {
      jobSettings.EventNotification = {
        CompleteTopicArn: snsTopicArn,
        ErrorTopicArn: snsTopicArn
      };
    }

    const command = new CreateJobCommand(jobSettings);
    const response = await client.send(command);

    if (!response.Job?.Id) {
      logger.error({ action: "createHeroMediaConvertJob", heroItemId }, "ヒーローMediaConvertジョブIDがレスポンスに含まれていない");
      return { error: "ジョブの作成に失敗しました" };
    }

    logger.info({ action: "createHeroMediaConvertJob", heroItemId, jobId: response.Job.Id }, "ヒーローMediaConvertジョブ作成成功");
    return { jobId: response.Job.Id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "ジョブの作成に失敗しました";
    logger.error({ action: "createHeroMediaConvertJob", heroItemId, err: error }, "ヒーローMediaConvertジョブ作成失敗");
    return { error: msg };
  }
}

/**
 * MediaConvertジョブのステータスを取得
 */
export async function getMediaConvertJobStatus(jobId: string): Promise<{
  status?: string;
  percentComplete?: number;
  error?: string;
}> {
  try {
    const client = createMediaConvertClient();

    const command = new GetJobCommand({ Id: jobId });
    const response = await client.send(command);

    if (!response.Job) {
      return { error: "ジョブが見つかりません" };
    }

    return {
      status: response.Job.Status,
      percentComplete: response.Job.JobPercentComplete ?? 0
    };
  } catch (error) {
    logger.error({ action: "getMediaConvertJobStatus", jobId, err: error }, "MediaConvertジョブステータス取得失敗");
    return {
      error: error instanceof Error ? error.message : "ジョブステータスの取得に失敗しました"
    };
  }
}
