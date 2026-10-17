import "server-only";
import { revalidateTag } from "next/cache";
import { publishState, type PublishState } from "@/content/cms";
import { Site, UserRecord } from "@/content/schemas";
import { keys, redis } from "./redis";
import { getDraft, getPublishedFresh, siteTag, SiteError } from "./site";

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

/** Every app account (`user:{email}`). Auth.js keys live under `auth:` and are not matched. */
export async function listSignups(): Promise<Signup[]> {
  const out: Signup[] = [];
  let cursor = "0";
  do {
    const [next, found] = await redis().scan(cursor, { match: "user:*", count: 200 });
    cursor = String(next);
    for (const key of found) {
      const parsed = UserRecord.safeParse(await redis().get<unknown>(key));
      // A malformed record is reported, not hidden: the admin page is where it gets noticed.
      if (!parsed.success) throw new SiteError("INVALID", `Stored ${key} is invalid`, parsed.error.issues);
      out.push({ ...parsed.data, email: key.slice("user:".length) });
    }
  } while (cursor !== "0");
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSites(): Promise<SiteSummary[]> {
  const [slugs, signups] = await Promise.all([redis().smembers(keys.sites()), listSignups()]);
  const owners = new Map(signups.map((s) => [s.slug, s]));
  const rows = await Promise.all(
    slugs.map(async (slug): Promise<SiteSummary | null> => {
      const [draft, published, firstPublishedAt, leads, unread] = await Promise.all([
        getDraft(slug),
        getPublishedFresh(slug),
        redis().get<string>(keys.firstPublished(slug)),
        redis().llen(keys.leads(slug)),
        redis().get<number>(keys.leadsUnread(slug)),
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
        unread: Math.max(0, Number(unread ?? 0)),
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
  const tx = redis().multi();
  tx.set(
    keys.draft(slug),
    Site.parse({ ...draft, settings: { ...draft.settings, status: suspended ? "suspended" : "draft" } }),
  );
  if (published) {
    const status = suspended ? "suspended" : "published";
    tx.set(keys.published(slug), Site.parse({ ...published, settings: { ...published.settings, status } }));
  }
  await tx.exec();
  revalidateTag(siteTag(slug), { expire: 0 });
}
