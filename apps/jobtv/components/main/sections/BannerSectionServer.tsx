import { getTopPageBanners } from "@/lib/actions/top-page-banner-actions";
import BannerSectionClient from "./BannerSectionClient";

export default async function BannerSectionServer() {
  const result = await getTopPageBanners();
  const banners = (result.data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    image: b.image_url,
    link: b.link_url ?? undefined,
  }));

  if (banners.length === 0) return null;
  return <BannerSectionClient banners={banners} />;
}
