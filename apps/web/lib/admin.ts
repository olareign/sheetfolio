import "server-only";
import { revalidateTag } from "next/cache";
import { publishState, type PublishState } from "@/content/cms";
import { collections, Site, UserRecord, type CollectionName, type UserPlan } from "@/content/schemas";
import { recordActivity } from "./activity";
import { getCredentials } from "./credentials";
import { env } from "./env";
import { tailorQuota } from "./ratelimit";
import { redis } from "./redis";
import { keys } from "./redis-keys";
import { admin as adminStoreOf, credentialStore, leads as leadStore, sites, tailored, users } from "./store";
import { reindexSites } from "./store/sites";
import { FEATURED_TAG, getDraft, getPublishedFresh, siteTag, SiteError } from "./site";

/*
 * What the admin console shows and changes. Reading is set-based (a few queries however many accounts there are);
 * every change is recorded in the activity log with the admin who made it. Authorisation is NOT here: every Server
 * Action in app/(platform)/admin calls `requireAdmin` before anything in this file.
 */

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

const parseSite = (doc: unknown): Site | null => {
  const parsed = Site.safeParse(doc);
  return parsed.success ? parsed.data : null;
};

export type AccountRow = {
  slug: string;
  email: string;
  name: string;
  headline: string;
  role: UserRecord["role"];
  plan: UserPlan;
  createdAt: string;
  status: PublishState;
  publishedAt?: string;
  firstPublishedAt?: string;
  minutesToFirstPublish?: number;
  projects: number;
  certifications: number;
  leads: number;
  unread: number;
};

/** Every account joined to its page and enquiry counts, in three queries. Accounts without a page get no row of their own. */
export async function listAccounts(): Promise<AccountRow[]> {
  const [accounts, docs, counts] = await Promise.all([users().list(), sites().listDocs(), leadStore().countsBySlug()]);
  const pages = new Map(docs.map((d) => [d.slug, d]));
  return accounts
    .flatMap(({ email, record }): AccountRow[] => {
      const doc = pages.get(record.slug);
      if (!doc) return [];
      const draft = parseSite(doc.draft);
      const published = parseSite(doc.published);
      const shown = published ?? draft;
      const c = counts.get(record.slug);
      return [
        {
          slug: record.slug,
          email,
          name: draft?.profile.name ?? record.name,
          headline: draft?.profile.headline ?? "",
          role: record.role,
          plan: record.plan,
          createdAt: record.createdAt,
          status: draft ? publishState(draft, published) : "unpublished",
          publishedAt: published?.publishedAt,
          firstPublishedAt: doc.firstPublishedAt ?? undefined,
          minutesToFirstPublish: doc.firstPublishedAt
            ? Math.round((Date.parse(doc.firstPublishedAt) - Date.parse(record.createdAt)) / 60_000)
            : undefined,
          projects: shown?.projects.length ?? 0,
          certifications: shown?.certifications.length ?? 0,
          leads: c?.total ?? 0,
          unread: c?.unread ?? 0,
        },
      ];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The first-publish metric view of the same data, oldest page address first (PRD §11). */
export async function listSites(): Promise<SiteSummary[]> {
  const [rows, docs] = await Promise.all([listAccounts(), sites().listDocs()]);
  const owners = new Map(rows.map((r) => [r.slug, r]));
  const summaries: SiteSummary[] = [];
  for (const d of docs) {
    const draft = parseSite(d.draft);
    if (!draft) continue; // registered but never finished onboarding
    const owner = owners.get(d.slug);
    const published = parseSite(d.published);
    const shown = published ?? draft;
    summaries.push({
      slug: d.slug,
      name: draft.profile.name,
      headline: draft.profile.headline,
      status: publishState(draft, published),
      owner: owner?.email,
      signedUpAt: owner?.createdAt,
      firstPublishedAt: d.firstPublishedAt ?? undefined,
      minutesToFirstPublish: owner?.minutesToFirstPublish,
      publishedAt: published?.publishedAt,
      projects: shown.projects.length,
      certifications: shown.certifications.length,
      leads: owner?.leads ?? 0,
      unread: owner?.unread ?? 0,
    });
  }
  return summaries.sort((a, b) => a.slug.localeCompare(b.slug));
}

// ── Filtering the account list ──────────────────────────────────────────────

export type AccountQuery = {
  q?: string;
  plan?: UserPlan;
  status?: PublishState;
  role?: UserRecord["role"];
};

/** Name, email, page address or headline contains the text (any case); the other filters must all match. */
export function filterAccounts(rows: readonly AccountRow[], query: AccountQuery): AccountRow[] {
  const q = query.q?.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!query.plan || r.plan === query.plan) &&
      (!query.status || r.status === query.status) &&
      (!query.role || r.role === query.role) &&
      (!q || [r.name, r.email, r.slug, r.headline].some((field) => field.toLowerCase().includes(q))),
  );
}

// ── Redis counters ──────────────────────────────────────────────────────────

const utcDays = (days: number, now: Date): string[] =>
  Array.from({ length: days }, (_, i) =>
    new Date(now.getTime() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );

async function mgetNumbers(redisKeys: string[]): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < redisKeys.length; i += 500) {
    const chunk = redisKeys.slice(i, i + 500);
    const got = await redis().mget<(number | string | null)[]>(...chunk);
    out.push(...got.map((v) => Number(v ?? 0)));
  }
  return out;
}

/** Page views over the last `days` UTC days (oldest first) for each page, read in a few batches. */
export async function viewsBySlug(
  slugs: readonly string[],
  days: number,
  now: Date = new Date(),
): Promise<Map<string, number[]>> {
  const dates = utcDays(days, now);
  const values = await mgetNumbers(slugs.flatMap((slug) => dates.map((d) => keys.viewsDay(slug, d))));
  return new Map(slugs.map((slug, i) => [slug, values.slice(i * days, (i + 1) * days)]));
}

/** All-time "Download CV" clicks for each page. */
export async function cvDownloadsBySlug(slugs: readonly string[]): Promise<Map<string, number>> {
  const values = await mgetNumbers(slugs.map((slug) => keys.cvDownloads(slug)));
  return new Map(slugs.map((slug, i) => [slug, values[i] ?? 0]));
}

const sum = (values: Iterable<number>) => [...values].reduce((a, b) => a + b, 0);

// ── Overview ────────────────────────────────────────────────────────────────

export type Overview = {
  totals: Awaited<ReturnType<ReturnType<typeof adminStoreOf>["totals"]>>;
  leads: { total: number; unread: number };
  viewsWeek: number;
  cvDownloads: number;
  /** Median of signup → first publish, in minutes, over pages that have gone live. */
  medianMinutesToPublish?: number;
  underThirty: { count: number; of: number };
  signupsWeek: number;
};

export async function getOverview(now: Date = new Date()): Promise<Overview> {
  const [totals, leads, accounts] = await Promise.all([adminStoreOf().totals(), leadStore().totals(), listAccounts()]);
  const slugs = accounts.map((a) => a.slug);
  const [views, downloads] = await Promise.all([viewsBySlug(slugs, 7, now), cvDownloadsBySlug(slugs)]);
  const minutes = accounts
    .flatMap((a) => (a.minutesToFirstPublish !== undefined ? [a.minutesToFirstPublish] : []))
    .sort((a, b) => a - b);
  const weekAgo = now.getTime() - 7 * 86_400_000;
  return {
    totals,
    leads,
    viewsWeek: sum([...views.values()].map(sum)),
    cvDownloads: sum(downloads.values()),
    medianMinutesToPublish: minutes.length ? minutes[Math.floor((minutes.length - 1) / 2)] : undefined,
    underThirty: { count: minutes.filter((m) => m < 30).length, of: minutes.length },
    signupsWeek: accounts.filter((a) => Date.parse(a.createdAt) >= weekAgo).length,
  };
}

// ── One account ─────────────────────────────────────────────────────────────

export type AccountDetail = {
  account: { email: string; record: UserRecord };
  draft: Site | null;
  published: Site | null;
  status: PublishState;
  hasPassword: boolean;
  username?: string;
  views: { date: string; views: number }[];
  cvDownloads: number;
  leadTotals: { total: number; unread: number };
  /** Tailorings left today per engine; null when the counter could not be read. */
  allowance: { engine: "groq" | "claude"; remaining: number; limit: number }[] | null;
  versions: number;
};

export async function getAccountDetail(slug: string, now: Date = new Date()): Promise<AccountDetail | null> {
  const account = await users().getBySlug(slug);
  if (!account) return null;
  const [draftDoc, published, creds, views, downloads, counts, versions, groq, claude] = await Promise.all([
    getDraft(slug),
    getPublishedFresh(slug),
    getCredentials(account.email),
    viewsBySlug([slug], 14, now),
    cvDownloadsBySlug([slug]),
    leadStore().countsBySlug(),
    tailored().list(slug),
    tailorQuota("groq", slug),
    tailorQuota("claude", slug),
  ]);
  const dates = utcDays(14, now);
  const dayViews = views.get(slug) ?? [];
  const c = counts.get(slug);
  return {
    account,
    draft: draftDoc,
    published,
    status: draftDoc ? publishState(draftDoc, published) : "unpublished",
    hasPassword: creds !== null,
    username: creds?.username,
    views: dates.map((date, i) => ({ date, views: dayViews[i] ?? 0 })),
    cvDownloads: downloads.get(slug) ?? 0,
    leadTotals: { total: c?.total ?? 0, unread: c?.unread ?? 0 },
    allowance:
      groq && claude
        ? [
            { engine: "groq", ...groq },
            { engine: "claude", ...claude },
          ]
        : null,
    versions: versions.length,
  };
}

// ── Content across every page ───────────────────────────────────────────────

export type ContentRow = {
  slug: string;
  owner: string;
  collection: CollectionName;
  id: string;
  title: string;
  detail: string;
  /** Whether this item is on the live page too, not just in the draft. */
  live: boolean;
  pageStatus: PublishState;
};

const clip = (text: string | undefined, max = 140) => {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** A short title and one line of detail for any collection item, for lists. */
export function describeItem(
  collection: CollectionName,
  item: Record<string, unknown>,
): { title: string; detail: string } {
  const str = (k: string) => (typeof item[k] === "string" ? (item[k] as string) : "");
  switch (collection) {
    case "projects":
      return {
        title: str("title") || "Untitled project",
        detail: clip([str("role"), str("scope")].filter(Boolean).join(" · ")),
      };
    case "experiences":
      return {
        title: [str("role"), str("company")].filter(Boolean).join(", ") || "Experience",
        detail: clip(str("notes")),
      };
    case "certifications":
      return {
        title: str("title") || "Certification",
        detail: clip([str("issuer"), String(item.year ?? "")].filter(Boolean).join(" · ")),
      };
    case "education":
      return { title: str("qualification") || "Education", detail: clip(str("institution")) };
    case "testimonials":
      return { title: str("author") || "Testimonial", detail: clip(str("quote")) };
    case "referees":
      return {
        title: str("name") || "Referee",
        detail: clip([str("role"), str("organisation")].filter(Boolean).join(" · ")),
      };
  }
}

export type ContentQuery = { collection: CollectionName; q?: string; slug?: string };

/** Every item of one collection across every page, from the drafts (what the owner has), marking what is live. */
export async function listContent(query: ContentQuery): Promise<ContentRow[]> {
  const [docs, accounts] = await Promise.all([sites().listDocs(), users().list()]);
  const owners = new Map(accounts.map((a) => [a.record.slug, a.email]));
  const q = query.q?.trim().toLowerCase();
  const rows: ContentRow[] = [];
  for (const d of docs) {
    if (query.slug && d.slug !== query.slug) continue;
    const draft = parseSite(d.draft);
    if (!draft) continue;
    const published = parseSite(d.published);
    const liveIds = new Set(((published?.[query.collection] ?? []) as { id: string }[]).map((i) => i.id));
    for (const item of draft[query.collection] as unknown as Record<string, unknown>[]) {
      const { title, detail } = describeItem(query.collection, item);
      if (q && ![title, detail, d.slug, owners.get(d.slug) ?? ""].some((t) => t.toLowerCase().includes(q))) continue;
      rows.push({
        slug: d.slug,
        owner: owners.get(d.slug) ?? "",
        collection: query.collection,
        id: String(item.id),
        title,
        detail,
        live: liveIds.has(String(item.id)),
        pageStatus: publishState(draft, published),
      });
    }
  }
  return rows;
}

// ── Changes (each one is logged with the admin who made it) ─────────────────

const audit = (actor: string, detail: string, slug?: string) =>
  recordActivity({ type: "admin", actor, detail, ...(slug && { slug }) });

const expirePage = (slug: string) => {
  revalidateTag(siteTag(slug), { expire: 0 });
  revalidateTag(FEATURED_TAG, { expire: 0 });
};

/**
 * Suspends (or restores) a site: both documents change status without touching `updatedAt`,
 * and the public cache is purged so the page 404s immediately (PRD §8.1).
 */
export async function setSuspended(slug: string, suspended: boolean, actor?: string): Promise<void> {
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
  expirePage(slug);
  if (actor) await audit(actor, suspended ? "Suspended the page" : "Restored the page", slug);
}

export async function setPlan(slug: string, plan: UserPlan, actor: string): Promise<void> {
  const account = await users().getBySlug(slug);
  if (!account) throw new SiteError("NOT_FOUND", `No account for ${slug}`);
  if (!(await users().setPlan(account.email, plan))) throw new SiteError("NOT_FOUND", `No account for ${slug}`);
  await audit(actor, `Moved the account to the ${plan} plan`, slug);
}

/** Ends every sign-in of the account: its sessions stop working at their next request. */
export async function signOutEverywhere(slug: string, actor: string): Promise<void> {
  const account = await users().getBySlug(slug);
  if (!account) throw new SiteError("NOT_FOUND", `No account for ${slug}`);
  await credentialStore().bumpEpoch(account.email);
  await audit(actor, "Signed the account out everywhere", slug);
}

async function scanKeys(match: string, max = 5000): Promise<{ found: string[]; capped: boolean }> {
  const found: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis().scan(cursor, { match, count: 500 });
    cursor = String(next);
    found.push(...batch);
    if (found.length >= max) return { found: found.slice(0, max), capped: cursor !== "0" || found.length > max };
  } while (cursor !== "0");
  return { found, capped: false };
}

async function deleteKeys(redisKeys: string[]): Promise<void> {
  for (let i = 0; i < redisKeys.length; i += 500) await redis().del(...redisKeys.slice(i, i + 500));
}

/** Gives the account its tailoring allowance back (both engines) by clearing its counters in Redis. */
export async function resetAllowances(slug: string, actor: string): Promise<number> {
  const { found } = await scanKeys(`ratelimit:tailor:*:account:${slug}:*`, 200);
  await deleteKeys(found);
  await audit(actor, "Reset the tailoring allowance", slug);
  return found.length;
}

export type DeleteResult = { ok: true } | { ok: false; reason: "NOT_FOUND" | "ADMIN" | "SELF" };

/**
 * Removes an account and everything it owns: Postgres in one transaction, then its counters, index entry and activity in
 * Redis. Admins, and the admin doing it, are never removed here. Files in Cloudinary are left; the page that pointed at
 * them is gone.
 */
export async function deleteAccount(slug: string, actor: string): Promise<DeleteResult> {
  const account = await users().getBySlug(slug);
  if (!account) return { ok: false, reason: "NOT_FOUND" };
  if (account.email === actor.toLowerCase()) return { ok: false, reason: "SELF" };
  if (account.record.role === "admin" || env().ADMIN_EMAILS.includes(account.email))
    return { ok: false, reason: "ADMIN" };

  await adminStoreOf().purgeAccount({ email: account.email, slug });
  try {
    const [views, cv, limits] = await Promise.all([
      scanKeys(`views:${slug}:*`),
      scanKeys(`cv:${slug}:*`),
      scanKeys(`ratelimit:tailor:*:account:${slug}:*`, 200),
    ]);
    await deleteKeys([
      ...views.found,
      ...cv.found,
      ...limits.found,
      keys.activityUser(slug),
      `reset-latest:${account.email}`,
    ]);
    await redis().srem(keys.sites(), slug);
  } catch (err) {
    // The account is already gone; leftover counters are harmless and `pnpm db:stats` can tidy them.
    console.error("[admin] account removed, Redis clean-up failed:", err instanceof Error ? err.message : err);
  }
  expirePage(slug);
  await audit(actor, `Deleted the account /${slug}`);
  return { ok: true };
}

/** Takes one item off a page, from the draft and from the live copy, so it disappears from the public page at once. */
export async function removeItem(
  slug: string,
  collection: CollectionName,
  id: string,
  actor: string,
): Promise<boolean> {
  const [draft, published] = await Promise.all([getDraft(slug), getPublishedFresh(slug)]);
  if (!draft) throw new SiteError("NOT_FOUND", `No site ${slug}`);
  const without = (site: Site): Site => {
    const items = site[collection] as unknown as { id: string }[];
    return Site.parse({ ...site, [collection]: items.filter((i) => i.id !== id) });
  };
  const had = (draft[collection] as unknown as { id: string }[]).some((i) => i.id === id);
  if (!had) return false;
  await sites().put(slug, { draft: without(draft), ...(published && { published: without(published) }) });
  expirePage(slug);
  await audit(actor, `Removed a ${collections[collection].label.toLowerCase()} item`, slug);
  return true;
}

export async function deleteLead(slug: string, id: string, actor: string): Promise<boolean> {
  const removed = await leadStore().remove(slug, id);
  if (removed) await audit(actor, "Deleted an enquiry", slug);
  return removed;
}

// ── System ──────────────────────────────────────────────────────────────────

export type SystemStatus = {
  redis: {
    dbsize: number | null;
    groups: { label: string; count: number; capped: boolean }[];
    indexed: number;
    pages: number;
  };
  tables: Record<string, number>;
  integrations: { name: string; on: boolean; note: string }[];
};

const REDIS_GROUPS = [
  { label: "Daily view counters", match: "views:*:2*" },
  { label: "Project view counters", match: "views:*:p:*" },
  { label: "CV download counters", match: "cv:*:downloads" },
  { label: "Rate limits", match: "ratelimit:*" },
  { label: "Password-reset links", match: "reset*" },
] as const;

export async function getSystemStatus(): Promise<SystemStatus> {
  const e = env();
  const [dbsize, groups, indexed, pages, tables] = await Promise.all([
    redis()
      .dbsize()
      .catch(() => null),
    Promise.all(
      REDIS_GROUPS.map(async (g) => {
        const { found, capped } = await scanKeys(g.match);
        return { label: g.label, count: found.length, capped };
      }),
    ),
    redis().scard(keys.sites()),
    sites().list(),
    adminStoreOf().tableCounts(),
  ]);
  return {
    redis: { dbsize, groups, indexed: Number(indexed), pages: pages.length },
    tables,
    integrations: [
      {
        name: "Standard AI (Groq)",
        on: Boolean(e.GROQ_API_KEY),
        note: `${e.GROQ_DAILY_LIMIT} runs a day across all accounts`,
      },
      { name: "Claude (Anthropic)", on: Boolean(e.ANTHROPIC_API_KEY), note: "Pro accounts" },
      { name: "Email (Resend)", on: Boolean(e.AUTH_RESEND_KEY), note: e.RESEND_FROM },
      { name: "Uploads (Cloudinary)", on: Boolean(e.CLOUDINARY_URL), note: "Photos and certificate scans" },
      { name: "Daily stats job", on: Boolean(e.CRON_SECRET), note: "Copies view totals to Postgres" },
    ],
  };
}

/** Makes the Redis page index name every page Postgres has. */
export async function reindexPages(actor: string): Promise<{ added: number; total: number }> {
  const result = await reindexSites(redis(), sites());
  await audit(actor, `Rebuilt the page index (${result.added} added)`);
  return result;
}
