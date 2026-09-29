import type { MetadataRoute } from "next";
import { publicSiteUrl } from "@/lib/env";
import { getPublished, listSiteSlugs } from "@/lib/site";

// Built per request from the `sites` set (PRD §8); published docs come from the tagged cache.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicSiteUrl();
  const url = (path: string) => new URL(path, base).toString();
  const entries: MetadataRoute.Sitemap = [{ url: url("/"), changeFrequency: "monthly", priority: 0.5 }];
  for (const slug of await listSiteSlugs()) {
    const site = await getPublished(slug); // null for unpublished and suspended sites
    if (!site) continue;
    const lastModified = site.publishedAt ? new Date(site.publishedAt) : undefined;
    entries.push({ url: url(`/${slug}`), lastModified, changeFrequency: "monthly", priority: 1 });
    for (const p of site.projects) {
      entries.push({ url: url(`/${slug}/projects/${p.id}`), lastModified, changeFrequency: "yearly", priority: 0.7 });
    }
  }
  return entries;
}
