import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import { z } from "zod";
import {
  collections,
  Lead,
  LeadInput,
  PublishableSite,
  Site,
  Slug,
  type CollectionItem,
  type CollectionName,
  type SiteInput,
} from "@/content/schemas";
import { keys, redis } from "./redis";

const VIEW_TTL_SECONDS = 90 * 24 * 60 * 60;
const MAX_LEADS = 500;
export const LEADS_PAGE_SIZE = 20;

export type SiteErrorCode = "NOT_FOUND" | "INVALID" | "SUSPENDED";

export class SiteError extends Error {
  constructor(
    readonly code: SiteErrorCode,
    message: string,
    readonly issues: z.core.$ZodIssue[] = [],
  ) {
    super(message);
    this.name = "SiteError";
  }
}

/** Cache tag shared by every public page of one site. Prefixed so it can't collide with other tags. */
export const siteTag = (slug: string) => `site:${slug}`;

function parseSite(raw: unknown, key: string): Site {
  const parsed = Site.safeParse(raw);
  if (!parsed.success) {
    // Stored data that no longer matches the schema is a bug or a migration gap: fail loudly.
    throw new SiteError("INVALID", `Stored document ${key} does not match the Site schema`, parsed.error.issues);
  }
  return parsed.data;
}

function assertSlug(slug: string): string {
  const parsed = Slug.safeParse(slug);
  if (!parsed.success) throw new SiteError("INVALID", `Invalid slug: ${slug}`, parsed.error.issues);
  return parsed.data;
}

// ── Draft ───────────────────────────────────────────────────────────────────

export async function getDraft(slug: string): Promise<Site | null> {
  const key = keys.draft(assertSlug(slug));
  const raw = await redis().get<unknown>(key);
  return raw === null ? null : parseSite(raw, key);
}

/** Validates the whole document and stamps `updatedAt`. */
export async function saveDraft(slug: string, site: SiteInput, now: Date = new Date()): Promise<Site> {
  const key = keys.draft(assertSlug(slug));
  const parsed = Site.safeParse({ ...site, updatedAt: now.toISOString() });
  if (!parsed.success) throw new SiteError("INVALID", "Draft failed validation", parsed.error.issues);
  await redis().set(key, parsed.data);
  return parsed.data;
}

/**
 * Replaces one collection array in the draft. Array order is display order.
 * Read-modify-write: safe because a site has exactly one editor (multi-editor is out of scope).
 */
export async function updateCollection<N extends CollectionName>(
  slug: string,
  name: N,
  items: z.input<(typeof collections)[N]["schema"]>[],
  now: Date = new Date(),
): Promise<CollectionItem<N>[]> {
  const draft = await getDraft(slug);
  if (!draft) throw new SiteError("NOT_FOUND", `No draft for ${slug}`);
  const parsed = z.array(collections[name].schema).safeParse(items);
  if (!parsed.success) throw new SiteError("INVALID", `Invalid ${name}`, parsed.error.issues);
  const ids = parsed.data.map((i) => i.id);
  if (new Set(ids).size !== ids.length) throw new SiteError("INVALID", `Duplicate ids in ${name}`);
  const saved = await saveDraft(slug, { ...draft, [name]: parsed.data }, now);
  return saved[name] as CollectionItem<N>[];
}

// ── Published ───────────────────────────────────────────────────────────────

/** Uncached read for the CMS (needs the real `publishedAt` to show "Unpublished changes"). */
export async function getPublishedFresh(slug: string): Promise<Site | null> {
  const key = keys.published(assertSlug(slug));
  const raw = await redis().get<unknown>(key);
  return raw === null ? null : parseSite(raw, key);
}

/**
 * Public read. Cached per slug and tagged, so public pages cost zero Redis reads until the next publish.
 * Suspended sites resolve to null so the public gets a 404 (PRD §8.1).
 */
export async function getPublished(slug: string): Promise<Site | null> {
  const valid = Slug.safeParse(slug);
  if (!valid.success) return null; // any unknown path under /[slug] is simply a 404
  const read = unstable_cache(
    async () => {
      const site = await getPublishedFresh(valid.data);
      return site && site.settings.status !== "suspended" ? site : null;
    },
    ["site-published", valid.data],
    { tags: [siteTag(valid.data)] },
  );
  return read();
}

/** Validate draft for publishing → copy to published with `publishedAt = now` → drop the public cache. */
export async function publish(slug: string, now: Date = new Date()): Promise<Site> {
  const draft = await getDraft(slug);
  if (!draft) throw new SiteError("NOT_FOUND", `No draft for ${slug}`);
  const current = await getPublishedFresh(slug);
  if (draft.settings.status === "suspended" || current?.settings.status === "suspended") {
    throw new SiteError("SUSPENDED", "This site is suspended and cannot be published");
  }
  const checked = PublishableSite.safeParse(draft);
  if (!checked.success) throw new SiteError("INVALID", "Draft is not ready to publish", checked.error.issues);

  const published: Site = {
    ...checked.data,
    publishedAt: now.toISOString(),
    settings: { ...checked.data.settings, status: "published" },
  };
  const tx = redis().multi();
  tx.set(keys.published(slug), published);
  tx.set(keys.firstPublished(slug), published.publishedAt, { nx: true });
  await tx.exec();
  // Expire immediately (not stale-while-revalidate): the engineer expects to see the change at once.
  revalidateTag(siteTag(slug), { expire: 0 });
  return published;
}

/** Every registered slug (the `sites` set). */
export async function listSiteSlugs(): Promise<string[]> {
  return redis().smembers(keys.sites());
}

// ── Slugs ───────────────────────────────────────────────────────────────────

/** Atomically reserves a slug (`SET NX`). Returns false if someone already holds it. */
export async function claimSlug(slug: string, userId: string): Promise<boolean> {
  const result = await redis().set(keys.slug(assertSlug(slug)), userId, { nx: true });
  return result === "OK";
}

// ── Views ───────────────────────────────────────────────────────────────────

const ProjectId = z.string().min(1).max(64);

/** Counts a page view (daily bucket, 90-day TTL) or a project view. Unknown slugs are ignored. */
export async function recordView(slug: string, projectId?: string, now: Date = new Date()): Promise<void> {
  const valid = Slug.safeParse(slug);
  if (!valid.success) return;
  if (projectId !== undefined && !ProjectId.safeParse(projectId).success) return;
  // Don't let anonymous beacons create counters for sites that don't exist.
  const exists = await redis().sismember(keys.sites(), valid.data);
  if (!exists) return;

  if (projectId !== undefined) {
    await redis().incr(keys.viewsProject(valid.data, projectId));
    return;
  }
  const key = keys.viewsDay(valid.data, now.toISOString().slice(0, 10));
  const p = redis().pipeline();
  p.incr(key);
  p.expire(key, VIEW_TTL_SECONDS);
  await p.exec();
}

// ── Leads ───────────────────────────────────────────────────────────────────

/** Stores an enquiry, newest first, keeping the latest 500, and bumps the unread counter. */
export async function addLead(slug: string, input: LeadInput, now: Date = new Date()): Promise<Lead> {
  const s = assertSlug(slug);
  const parsed = LeadInput.safeParse(input);
  if (!parsed.success) throw new SiteError("INVALID", "Invalid enquiry", parsed.error.issues);
  const lead: Lead = { ...parsed.data, id: crypto.randomUUID(), createdAt: now.toISOString(), read: false };
  const p = redis().multi();
  p.lpush(keys.leads(s), lead);
  p.ltrim(keys.leads(s), 0, MAX_LEADS - 1);
  p.incr(keys.leadsUnread(s));
  await p.exec();
  return lead;
}

/** Page is zero-based. `read` comes from the read-set, not the stored item. */
export async function listLeads(slug: string, page: number, pageSize: number = LEADS_PAGE_SIZE): Promise<Lead[]> {
  const s = assertSlug(slug);
  const safePage = Number.isInteger(page) && page >= 0 ? page : 0;
  const start = safePage * pageSize;
  const raw = await redis().lrange<unknown>(keys.leads(s), start, start + pageSize - 1);
  const leads = raw.map((r) => {
    const parsed = Lead.safeParse(r);
    if (!parsed.success)
      throw new SiteError("INVALID", `Stored lead in ${keys.leads(s)} is invalid`, parsed.error.issues);
    return parsed.data;
  });
  if (leads.length === 0) return leads;
  const read = await redis().smismember(
    keys.leadsRead(s),
    leads.map((l) => l.id),
  );
  return leads.map((l, i) => ({ ...l, read: read[i] === 1 }));
}

export async function countLeads(slug: string): Promise<number> {
  return redis().llen(keys.leads(assertSlug(slug)));
}

export async function getUnreadCount(slug: string): Promise<number> {
  const n = await redis().get<number>(keys.leadsUnread(assertSlug(slug)));
  return Math.max(0, Number(n ?? 0));
}

const LeadId = z.string().uuid();

/**
 * Marks one lead read. The read state lives in a set, so a lead arriving at the same moment
 * (which shifts list positions) can never cause the wrong item to be updated.
 * Returns false if the lead doesn't exist (e.g. trimmed or a forged id).
 */
export async function markLeadRead(slug: string, id: string): Promise<boolean> {
  const s = assertSlug(slug);
  if (!LeadId.safeParse(id).success) return false;
  const all = await redis().lrange<{ id?: unknown }>(keys.leads(s), 0, -1);
  if (!all.some((l) => l.id === id)) return false;
  const added = await redis().sadd(keys.leadsRead(s), id);
  if (added === 1) {
    const left = await redis().decr(keys.leadsUnread(s));
    if (left < 0) await redis().set(keys.leadsUnread(s), 0); // self-heal a drifted counter
  }
  return true;
}

/** Marks every stored lead read and resets the read-set to exactly the current leads (prunes trimmed ids). */
export async function markAllLeadsRead(slug: string): Promise<void> {
  const s = assertSlug(slug);
  const ids = (await redis().lrange<{ id?: unknown }>(keys.leads(s), 0, -1))
    .map((l) => l.id)
    .filter((id): id is string => typeof id === "string");
  const tx = redis().multi();
  tx.del(keys.leadsRead(s));
  if (ids.length) tx.sadd(keys.leadsRead(s), ...(ids as [string, ...string[]]));
  // A lead arriving between the read above and this write would be counted as read; the window is
  // milliseconds and the lead itself still shows as unread in the inbox.
  tx.set(keys.leadsUnread(s), 0);
  await tx.exec();
}

// ── View counters (dashboard) ───────────────────────────────────────────────

export type DayViews = { date: string; views: number };

/** Page views for the 7 UTC days ending today, oldest first. */
export async function getWeekViews(slug: string, now: Date = new Date()): Promise<DayViews[]> {
  const s = assertSlug(slug);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const counts = await redis().mget<(number | null)[]>(...dates.map((d) => keys.viewsDay(s, d)));
  return dates.map((date, i) => ({ date, views: Number(counts[i] ?? 0) }));
}

/** All-time views per project id. */
export async function getProjectViews(slug: string, projectIds: readonly string[]): Promise<Record<string, number>> {
  const s = assertSlug(slug);
  if (projectIds.length === 0) return {};
  const counts = await redis().mget<(number | null)[]>(...projectIds.map((id) => keys.viewsProject(s, id)));
  return Object.fromEntries(projectIds.map((id, i) => [id, Number(counts[i] ?? 0)]));
}
