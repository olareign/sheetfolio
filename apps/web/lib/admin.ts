import "server-only";
import { revalidateTag } from "next/cache";
import { publishState, type PublishState } from "@/content/cms";
import { Site, UserRecord } from "@/content/schemas";
import { leads as leadStore, sites, users } from "./store";
import { FEATURED_TAG, getDraft, getPublishedFresh, siteTag, SiteError } from "./site";

export type Signup = UserRecord & { email: string };

export type SiteSummary = {
  slug: string;
  name: string;
  headline: string;
  status: PublishState;
  owner?: string;
  signedUpAt?: string;
  firstPublishedAt?: string;
  /** Signup → first publish, the < 30 min goal (PRD §11). */
  minutesToFirstPublish?: number;
  publishedAt?: string;
  projects: number;
  certifications: number;
  leads: number;
  unread: number;
};

/** Every app account, newest first. */
export async function listSignups(): Promise<Signup[]> {
  return (await users().list()).map(({ email, record }) => ({ ...record, email }));
}

export async function listSites(): Promise<SiteSummary[]> {
  const [slugs, signups] = await Promise.all([sites().list(), listSignups()]);
  const owners = new Map(signups.map((s) => [s.slug, s]));
  const rows = await Promise.all(
    slugs.map(async (slug): Promise<SiteSummary | null> => {
      const [draft, published, firstPublishedAt, leads, unread] = await Promise.all([
        getDraft(slug),
        getPublishedFresh(slug),
        sites().firstPublishedAt(slug),
        leadStore().count(slug),
        leadStore().unread(slug),
      ]);
      if (!draft) return null; // registered but never finished onboarding
      const owner = owners.get(slug);
      const minutes =
        owner && firstPublishedAt
          ? Math.round((Date.parse(firstPublishedAt) - Date.parse(owner.createdAt)) / 60_000)
          : undefined;
      return {
        slug,
        name: draft.profile.name,
        headline: draft.profile.headline,
        status: publishState(draft, published),
        owner: owner?.email,
        signedUpAt: owner?.createdAt,
        firstPublishedAt: firstPublishedAt ?? undefined,
        minutesToFirstPublish: minutes,
        publishedAt: published?.publishedAt,
        projects: (published ?? draft).projects.length,
        certifications: (published ?? draft).certifications.length,
        leads,
        unread,
      };
    }),
  );
  return rows.filter((r): r is SiteSummary => r !== null).sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Suspends (or restores) a site: both documents change status without touching `updatedAt`,
 * and the public cache is purged so the page 404s immediately (PRD §8.1).
 */
export async function setSuspended(slug: string, suspended: boolean): Promise<void> {
  const [draft, published] = await Promise.all([getDraft(slug), getPublishedFresh(slug)]);
  if (!draft) throw new SiteError("NOT_FOUND", `No site ${slug}`);
  await sites().put(slug, {
    draft: Site.parse({ ...draft, settings: { ...draft.settings, status: suspended ? "suspended" : "draft" } }),
    ...(published && {
      published: Site.parse({
        ...published,
        settings: { ...published.settings, status: suspended ? "suspended" : "published" },
      }),
    }),
  });
  revalidateTag(siteTag(slug), { expire: 0 });
  revalidateTag(FEATURED_TAG, { expire: 0 });
}
