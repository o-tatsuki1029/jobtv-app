import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * CloudFront URLを生成（内部関数）
 */
function getHlsManifestUrl(companyId: string, videoId: string, aspectRatio: "landscape" | "portrait"): string {
  const cloudFrontUrl = process.env.AWS_CLOUDFRONT_URL;
  if (!cloudFrontUrl) {
    throw new Error("CloudFrontが設定されていません");
  }
  const baseUrl = cloudFrontUrl.replace(/\/$/, "");
  const s3Key = `transcoded/${aspectRatio}/${companyId}/videos/${videoId}/hls/master.m3u8`;
  return `${baseUrl}/${s3Key}`;
}

/**
 * MediaConvert完了通知を受信するWebhookエンドポイント
 * AWS SNSから呼び出される
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    let message: any;

    try {
      message = JSON.parse(body);
    } catch (error) {
      console.error("Failed to parse SNS message:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // SNS通知の検証（SubscriptionConfirmationとNotificationを処理）
    if (message.Type === "SubscriptionConfirmation") {
      // SNSトピックのサブスクリプション確認
      console.log("SNS SubscriptionConfirmation received");
      // SubscribeURLにアクセスしてサブスクリプションを確認する必要がある
      // 通常はAWSコンソールから手動で確認するか、自動化スクリプトで処理
      return NextResponse.json({ message: "Subscription confirmation received" });
    }

    if (message.Type === "Notification") {
      // 実際の通知メッセージ
      let notificationMessage: any;
      try {
        notificationMessage = JSON.parse(message.Message);
      } catch (error) {
        console.error("Failed to parse notification message:", error);
        return NextResponse.json({ error: "Invalid notification message" }, { status: 400 });
      }

      // MediaConvertイベントの処理
      const jobId = notificationMessage.detail?.jobId;
      const status = notificationMessage.detail?.status; // COMPLETE, ERROR, etc.

      if (!jobId) {
        console.error("Job ID not found in notification");
        return NextResponse.json({ error: "Job ID not found" }, { status: 400 });
      }

      const supabase = createAdminClient();

      // ジョブIDから動画を検索
      const { data: draft, error: findError } = await supabase
        .from("videos_draft")
        .select("*")
        .eq("mediaconvert_job_id", jobId)
        .maybeSingle();

      if (findError || !draft) {
        console.error("Video draft not found for job ID:", jobId, findError);
        return NextResponse.json({ error: "Video draft not found" }, { status: 404 });
      }

      if (status === "COMPLETE") {
        // 変換完了
        // S3キーからaspectRatioを推測（video_urlから）
        // video_urlの形式: .../source/{landscape|portrait}/...
        let aspectRatio: "landscape" | "portrait" = "landscape";
        if (draft.video_url.includes("/source/portrait/")) {
          aspectRatio = "portrait";
        } else if (draft.video_url.includes("/source/landscape/")) {
          aspectRatio = "landscape";
        }

        const streamingUrl = getHlsManifestUrl(draft.company_id, draft.id, aspectRatio);

        const { error: updateError } = await supabase
          .from("videos_draft")
          .update({
            conversion_status: "completed",
            streaming_url: streamingUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", draft.id);

        if (updateError) {
          console.error("Failed to update video draft:", updateError);
          return NextResponse.json({ error: "Failed to update video draft" }, { status: 500 });
        }

        console.log(`Video conversion completed: ${draft.id}, job: ${jobId}`);
        return NextResponse.json({ message: "Video conversion status updated", videoId: draft.id });
      } else if (status === "ERROR" || status === "CANCELED") {
        // 変換エラーまたはキャンセル
        const { error: updateError } = await supabase
          .from("videos_draft")
          .update({
            conversion_status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("id", draft.id);

        if (updateError) {
          console.error("Failed to update video draft status:", updateError);
          return NextResponse.json({ error: "Failed to update video draft status" }, { status: 500 });
        }

        console.log(`Video conversion failed: ${draft.id}, job: ${jobId}`);
        return NextResponse.json({ message: "Video conversion status updated to failed", videoId: draft.id });
      }

      return NextResponse.json({ message: "Notification received but no action taken" });
    }

    return NextResponse.json({ message: "Unknown message type" }, { status: 400 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

