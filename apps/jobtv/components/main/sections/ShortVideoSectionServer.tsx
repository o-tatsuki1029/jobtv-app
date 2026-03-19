import { getPublicVideosForTopPage } from "@/lib/actions/video-actions";
import VideoObjectListJsonLd from "@/components/seo/VideoObjectListJsonLd";
import ShortVideoSectionClient from "./ShortVideoSectionClient";

export default async function ShortVideoSectionServer() {
  const result = await getPublicVideosForTopPage("short");
  const videos = (result.data ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail_url || v.auto_thumbnail_url || null,
    channel: v.company_name || "",
    streamingUrl: v.streaming_url ?? null,
    videoUrl: v.video_url ?? undefined,
  }));

  if (videos.length === 0) return null;
  return (
    <>
      <VideoObjectListJsonLd videos={videos} />
      <ShortVideoSectionClient videos={videos} />
    </>
  );
}
