import { getTopPageDocumentaries } from "@/lib/actions/top-page-documentary-actions";
import DocumentarySectionClient from "./DocumentarySectionClient";

export default async function DocumentarySectionServer() {
  const result = await getTopPageDocumentaries();
  const documentaries = (result.data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    thumbnail: d.thumbnail_url,
    channel: d.channel,
    linkUrl: d.link_url ?? undefined,
  }));

  if (documentaries.length === 0) return null;
  return <DocumentarySectionClient documentaries={documentaries} />;
}
