import { getPublicVideosForTopPage } from "@/lib/actions/video-actions";
import VideoObjectListJsonLd from "@/components/seo/VideoObjectListJsonLd";
import ShukatsuVideoSectionClient from "./ShukatsuVideoSectionClient";

export default async function ShukatsuVideoSectionServer() {
  const result = await getPublicVideosForTopPage("documentary");
  const videos = (result.data ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail_url || v.auto_thumbnail_url || "",
    channel: v.company_name || "",
    streamingUrl: v.streaming_url ?? null,
    videoUrl: v.video_url ?? undefined,
  }));

  if (videos.length === 0) return null;
  return (
    <>
      <VideoObjectListJsonLd videos={videos} />
      <ShukatsuVideoSectionClient videos={videos} />
    </>
  );
}
