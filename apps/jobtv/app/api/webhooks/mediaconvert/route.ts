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
  const s3Key = `companies/${companyId}/videos/${videoId}/hls/${aspectRatio}/original.m3u8`;
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
      console.log("[Webhook] NG: invalid JSON");
      console.error("Failed to parse SNS message:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    console.log("[Webhook] SNS received: type=" + (message.Type || "unknown"));

    // SNS通知の検証（SubscriptionConfirmationとNotificationを処理）
    if (message.Type === "SubscriptionConfirmation") {
      // SNSトピックのサブスクリプション確認
      console.log("[Webhook] SubscriptionConfirmation received");
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
        console.log("[Webhook] NG: invalid notification message");
        console.error("Failed to parse notification message:", error);
        return NextResponse.json({ error: "Invalid notification message" }, { status: 400 });
      }

      // MediaConvertイベントの処理
      const jobId = notificationMessage.detail?.jobId;
      const status = notificationMessage.detail?.status; // COMPLETE, ERROR, etc.

      if (!jobId) {
        console.log("[Webhook] NG: Job ID not found in notification");
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
        console.log("[Webhook] NG: draft not found jobId=" + jobId);
        console.error("Video draft not found for job ID:", jobId, findError);
        return NextResponse.json({ error: "Video draft not found" }, { status: 404 });
      }

      if (status === "COMPLETE") {
        // 変換完了
        // UserMetadataからaspectRatio・videoIdを取得（MediaConvertジョブ作成時に設定済み）
        // videoIdはS3パスに使ったID（新規時はtemp-xxx、既存更新時はdraft.id）
        const rawAspectRatio = notificationMessage.detail?.userMetadata?.aspectRatio;
        const aspectRatio: "landscape" | "portrait" =
          rawAspectRatio === "portrait" ? "portrait" : "landscape";
        const s3VideoId =
          (notificationMessage.detail?.userMetadata?.videoId as string | undefined) ?? draft.id;

        const cfBase = process.env.AWS_CLOUDFRONT_URL?.replace(/\/$/, "");
        const streamingUrl = getHlsManifestUrl(draft.company_id, s3VideoId, aspectRatio);
        const autoThumbnailUrl = cfBase
          ? `${cfBase}/companies/${draft.company_id}/videos/${s3VideoId}/hls/${aspectRatio}/original-thumb.0000000.jpg`
          : null;

        const { error: updateError } = await supabase
          .from("videos_draft")
          .update({
            conversion_status: "completed",
            streaming_url: streamingUrl,
            auto_thumbnail_url: autoThumbnailUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", draft.id);

        if (updateError) {
          console.log("[Webhook] NG: update draft error=" + updateError.message);
          console.error("Failed to update video draft:", updateError);
          return NextResponse.json({ error: "Failed to update video draft" }, { status: 500 });
        }

        console.log("[Webhook] COMPLETE: jobId=" + jobId + ", draftId=" + draft.id);
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
          console.log("[Webhook] NG: update draft status error=" + updateError.message);
          console.error("Failed to update video draft status:", updateError);
          return NextResponse.json({ error: "Failed to update video draft status" }, { status: 500 });
        }

        console.log("[Webhook] ERROR: jobId=" + jobId + ", draftId=" + draft.id);
        return NextResponse.json({ message: "Video conversion status updated to failed", videoId: draft.id });
      }

      return NextResponse.json({ message: "Notification received but no action taken" });
    }

    console.log("[Webhook] NG: unknown message type");
    return NextResponse.json({ message: "Unknown message type" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    console.log("[Webhook] NG: " + msg);
    console.error("Webhook error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

