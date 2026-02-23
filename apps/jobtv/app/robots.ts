import { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/_next/", "/studio/", "/admin/", "/auth/"]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
