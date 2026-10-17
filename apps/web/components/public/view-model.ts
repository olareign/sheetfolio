import type { ProjectCardData } from "@/components/sp/ProjectCard";
import { employerOf, projectYears } from "@/content/derive";
import type { Project, Site } from "@/content/schemas";
import { whatsappLink } from "@/lib/whatsapp";

/** What every public section needs besides the site document. */
export type PageContext = {
  site: Site;
  slug: string;
  /** Where profile links point: "/{slug}" live, "/preview" for the draft preview. */
  basePath: string;
  /** Draft preview: no enquiries, no view counting. */
  preview?: boolean;
};

/** Versioned by publish time so each published CV can be cached forever (see /api/cv). */
export const cvHref = (slug: string, publishedAt?: string) =>
  `/api/cv/${slug}${publishedAt ? `?v=${encodeURIComponent(publishedAt)}` : ""}`;

export function whatsappHref(site: Site, context?: string): string {
  return whatsappLink(site.profile.whatsapp, site.profile.whatsappMessage, context);
}

export function toCardData(site: Site, p: Project): ProjectCardData {
  const employer = employerOf(site, p)?.company ?? p.client;
  const cover = p.images[0];
  return {
    id: p.id,
    drawingNo: p.drawingNo,
    title: p.title,
    category: p.category,
    status: p.status,
    years: projectYears(p),
    meta: [employer, p.location].filter(Boolean).join(" · "),
    cover: cover ? { url: cover.url, alt: cover.caption || p.title } : undefined,
  };
}
