"use server";

import { MediaConvertClient, CreateJobCommand, GetJobCommand } from "@aws-sdk/client-mediaconvert";

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
    const client = createMediaConvertClient();
    const bucket = process.env.AWS_S3_BUCKET || "jobtv-videos-stg";
    const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN;
    const templateLandscape = process.env.AWS_MEDIACONVERT_TEMPLATE_LANDSCAPE;
    const templatePortrait = process.env.AWS_MEDIACONVERT_TEMPLATE_PORTRAIT;

    if (!roleArn) {
      return { error: "AWS_MEDIACONVERT_ROLE_ARNが設定されていません" };
    }

    const templateArn = config.aspectRatio === "portrait" ? templatePortrait : templateLandscape;

    if (!templateArn) {
      return {
        error: `AWS_MEDIACONVERT_TEMPLATE_${config.aspectRatio.toUpperCase()}が設定されていません`
      };
    }

    // SNSトピックARNを取得（オプション）
    const snsTopicArn = process.env.AWS_SNS_TOPIC_ARN;

    // 出力先を設定
    const destinationS3Key = `transcoded/${config.aspectRatio}/${config.companyId}/videos/${config.videoId}/hls/`;

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
      return { error: "ジョブの作成に失敗しました" };
    }

    return { jobId: response.Job.Id };
  } catch (error) {
    console.error("MediaConvert job creation error:", error);
    return {
      error: error instanceof Error ? error.message : "ジョブの作成に失敗しました"
    };
  }
}

/**
 * MediaConvertジョブのステータスを取得
 */
export async function getMediaConvertJobStatus(jobId: string): Promise<{
  status?: string;
  error?: string;
}> {
  try {
    const client = createMediaConvertClient();

    const command = new GetJobCommand({ Id: jobId });
    const response = await client.send(command);

    if (!response.Job) {
      return { error: "ジョブが見つかりません" };
    }

    return { status: response.Job.Status };
  } catch (error) {
    console.error("Get MediaConvert job status error:", error);
    return {
      error: error instanceof Error ? error.message : "ジョブステータスの取得に失敗しました"
    };
  }
}
