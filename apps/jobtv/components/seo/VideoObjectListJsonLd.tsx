interface VideoItem {
  id: string;
  title: string;
  thumbnail: string | null;
  channel: string;
  streamingUrl?: string | null;
  videoUrl?: string;
}

interface VideoObjectListJsonLdProps {
  videos: VideoItem[];
}

/**
 * VideoObject JSON-LD (ItemList 形式)
 * uploadDate がないため Google の Video リッチリザルトには非対応だが、
 * AI クローラー向けのコンテキストとして有効。
 */
export default function VideoObjectListJsonLd({ videos }: VideoObjectListJsonLdProps) {
  const items = videos
    .filter((v) => v.thumbnail)
    .map((v, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "VideoObject",
        name: v.title,
        thumbnailUrl: v.thumbnail!,
        ...(v.streamingUrl || v.videoUrl
          ? { contentUrl: v.streamingUrl || v.videoUrl }
          : {}),
        author: { "@type": "Organization", name: v.channel }
      }
    }));

  if (items.length === 0) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
