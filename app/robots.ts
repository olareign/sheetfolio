import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/preview", "/admin", "/api/", "/login", "/onboarding"],
      },
    ],
    sitemap: new URL("/sitemap.xml", publicSiteUrl()).toString(),
  };
}
