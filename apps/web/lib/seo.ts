import type { Site } from "@/content/schemas";

/** Serialises structured data for a `<script type="application/ld+json">` tag. `<` is escaped so no value can close the tag. */
export function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** schema.org Person for a published page: what a search engine shows as a knowledge panel or rich result. */
export function personJsonLd(site: Site, url: string): Record<string, unknown> {
  const { name, headline, summary, location, avatar } = site.profile;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: headline,
    url,
    ...(summary && { description: summary.slice(0, 300) }),
    ...(avatar && { image: avatar }),
    ...(location && { homeLocation: { "@type": "Place", name: location } }),
  };
}

/** The short description used for search results and link previews. */
export function pageDescription(site: Site): string {
  const { summary, headline, location } = site.profile;
  if (summary) return summary.replace(/\s+/g, " ").trim().slice(0, 160);
  return `${headline}${location ? ` based in ${location}` : ""}.`;
}
