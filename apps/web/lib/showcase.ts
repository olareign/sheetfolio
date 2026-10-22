import "server-only";
import { unstable_cache } from "next/cache";
import { projectCover, type Cover } from "@/content/covers";
import type { Site } from "@/content/schemas";
import { FEATURED_TAG, getDayViews, getProjectViews, getPublished, listSiteSlugs } from "./site";

/*
 * The public "Featured" page: published sites that haven't opted out, most visited first. Views are the page
 * views of the last 30 days; project opens break ties, then the newest publish.
 */

export const SHOWCASE_DAYS = 30;

export type FeaturedUser = {
  slug: string;
  name: string;
  headline: string;
  location: string;
  /** Picture of their most-opened project. */
  cover: Cover;
  coverTitle?: string;
  views: number;
  projectViews: number;
  projects: number;
  publishedAt: string;
};

/** Most views first; ties go to more project opens, then the newest publish, then the name. */
export function rankFeatured<T extends Pick<FeaturedUser, "views" | "projectViews" | "publishedAt" | "name">>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      b.views - a.views ||
      b.projectViews - a.projectViews ||
      b.publishedAt.localeCompare(a.publishedAt) ||
      a.name.localeCompare(b.name),
  );
}

/** The project to show on a user's card: the most opened one, else the first. */
export function leadProject(site: Site, projectViews: Record<string, number>): Site["projects"][number] | undefined {
  return [...site.projects].sort((a, b) => (projectViews[b.id] ?? 0) - (projectViews[a.id] ?? 0))[0];
}

export async function getFeaturedUsers(limit = 12, now: Date = new Date()): Promise<FeaturedUser[]> {
  const slugs = await listSiteSlugs();
  const loaded = await Promise.all(
    slugs.map(async (slug): Promise<FeaturedUser | null> => {
      const site = await getPublished(slug);
      if (!site?.publishedAt || !site.settings.showInShowcase) return null;
      const [days, perProject] = await Promise.all([
        getDayViews(slug, SHOWCASE_DAYS, now),
        getProjectViews(
          slug,
          site.projects.map((p) => p.id),
        ),
      ]);
      const lead = leadProject(site, perProject);
      return {
        slug,
        name: site.profile.name,
        headline: site.profile.headline,
        location: site.profile.location,
        cover: lead
          ? projectCover(lead)
          : { url: "/stock/landing/lagos-skyline.jpg", alt: "The Lagos skyline", kind: "stock" },
        coverTitle: lead?.title,
        views: days.reduce((n, d) => n + d.views, 0),
        projectViews: Object.values(perProject).reduce((n, v) => n + v, 0),
        projects: site.projects.length,
        publishedAt: site.publishedAt,
      };
    }),
  );
  return rankFeatured(loaded.filter((u): u is FeaturedUser => u !== null)).slice(0, limit);
}

/** Seconds a ranking may go stale. Views move it slowly; going live, a suspension and an opt-out drop it at once. */
const FEATURED_REVALIDATE_SECONDS = 60;

/**
 * The ranking the public pages show. Cached and tagged, so a landing-page visit costs no Redis reads, and
 * `publish` / `setSuspended` expire the tag: a page that goes live appears on the list straight away.
 */
export const getFeaturedUsersCached = unstable_cache((limit: number) => getFeaturedUsers(limit), ["featured-users"], {
  tags: [FEATURED_TAG],
  revalidate: FEATURED_REVALIDATE_SECONDS,
});
