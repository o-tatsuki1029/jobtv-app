import { getLpSampleVideos } from "@/lib/actions/lp-sample-video-actions";
import { getLpFaqItems } from "@/lib/actions/lp-faq-actions";
import { getLpCompanyLogos } from "@/lib/actions/lp-company-logo-actions";
import { getActiveLpScrollBanner } from "@/lib/actions/lp-scroll-banner-actions";
import { LPClient } from "./_components/lp-client";
import "./lp.css";

export default async function LPPage() {
  const [videosRes, faqRes, logosRes, bannerRes] = await Promise.all([
    getLpSampleVideos(),
    getLpFaqItems(),
    getLpCompanyLogos(),
    getActiveLpScrollBanner()
  ]);

  const sampleVideos = videosRes.data ?? [];
  const faqItems = faqRes.data ?? [];
  const companyLogosTop = (logosRes.data ?? []).filter((l) => l.row_position === "top");
  const companyLogosBottom = (logosRes.data ?? []).filter((l) => l.row_position === "bottom");
  const scrollBanner = bannerRes.data ?? null;

  return (
    <LPClient
      sampleVideos={sampleVideos}
      faqItems={faqItems}
      companyLogosTop={companyLogosTop}
      companyLogosBottom={companyLogosBottom}
      scrollBanner={scrollBanner}
    />
  );
}
