import { getTopPageShunDiaries } from "@/lib/actions/top-page-shundiary-actions";
import ShundiarySectionClient from "./ShundiarySectionClient";

export default async function ShundiarySectionServer() {
  const result = await getTopPageShunDiaries();
  const items = (result.data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    thumbnail: s.thumbnail_url,
    linkUrl: s.link_url ?? undefined,
  }));

  if (items.length === 0) return null;
  return <ShundiarySectionClient items={items} />;
}
