import type { Redis } from "@upstash/redis";
import { iso, type Db } from "../db/types";
import { keys } from "../redis-keys";

/*
 * A page's documents: the draft the owner edits, the published copy visitors see, and when it first went live, in
 * Postgres. The documents are opaque here (JSON); lib/site.ts checks their shape on the way in and out.
 *
 * The set of registered page addresses also lives in Redis (the "sites" set), as a fast index: the view counter asks
 * "is this a real page?" on every visit, and that must not wake the database each time. Postgres is the truth for it;
 * `pnpm db:stats reindex` rebuilds the Redis copy.
 */

export interface SiteStore {
  getDraft(slug: string): Promise<unknown | null>;
  getPublished(slug: string): Promise<unknown | null>;
  firstPublishedAt(slug: string): Promise<string | null>;
  /** Every registered page address. */
  list(): Promise<string[]>;
  /** Registers a page with this draft (replacing any draft already there). */
  create(slug: string, draft: unknown): Promise<void>;
  /** Replaces the draft, and the published copy too when one is given, together. */
  put(slug: string, docs: { draft: unknown; published?: unknown }): Promise<void>;
  /** Makes `doc` the published copy, and records the first time a page ever went live. */
  publish(slug: string, published: { doc: unknown; publishedAt: string }): Promise<void>;
}

type DocRow = { doc: unknown };

/** The `updatedAt` / `publishedAt` stamp inside a document, as a timestamp the row can be ordered by. */
function stamp(doc: unknown, field: "updatedAt" | "publishedAt"): string | null {
  const v = typeof doc === "object" && doc !== null ? (doc as Record<string, unknown>)[field] : undefined;
  return typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : null;
}

/** When a published copy went live: its own stamp, else the best other evidence, so the table's rule always holds. */
function publishedStamp(published: unknown, ...fallbacks: (string | null)[]): string {
  return stamp(published, "publishedAt") ?? fallbacks.find((f): f is string => f !== null) ?? new Date().toISOString();
}

export function siteStore(
  db: () => Db,
  /** Adds a page address to the Redis index; see the note at the top of this file. */
  indexAdd: (slug: string) => Promise<void>,
): SiteStore {
  const one = async (slug: string, column: "draft" | "published") =>
    (await db().query<DocRow>(`select ${column} as doc from sites where slug = $1`, [slug]))[0]?.doc ?? null;

  const store: SiteStore = {
    getDraft: (slug) => one(slug, "draft"),
    getPublished: (slug) => one(slug, "published"),
    async firstPublishedAt(slug) {
      const rows = await db().query<{ t: unknown }>("select first_published_at as t from sites where slug = $1", [
        slug,
      ]);
      return rows[0]?.t ? iso(rows[0].t) : null;
    },
    async list() {
      return (await db().query<{ slug: string }>("select slug from sites order by slug")).map((r) => r.slug);
    },
    async create(slug, draft) {
      await store.put(slug, { draft });
      // The page exists once Postgres has it; a failed index update is repaired by `pnpm db:stats reindex`.
      try {
        await indexAdd(slug);
      } catch (err) {
        console.error("[store] register page: index update failed:", err instanceof Error ? err.message : err);
      }
    },
    async put(slug, { draft, published }) {
      const updatedAt = stamp(draft, "updatedAt") ?? new Date().toISOString();
      if (published === undefined) {
        // The published copy, if there is one, is left as it is.
        await db().query(
          `insert into sites (slug, draft, draft_updated_at) values ($1, $2::jsonb, $3)
           on conflict (slug) do update set draft = excluded.draft, draft_updated_at = excluded.draft_updated_at`,
          [slug, JSON.stringify(draft), updatedAt],
        );
        return;
      }
      const publishedAt = publishedStamp(published, updatedAt);
      await db().query(
        `insert into sites (slug, draft, draft_updated_at, published, published_at) values ($1, $2::jsonb, $3, $4::jsonb, $5)
         on conflict (slug) do update set draft = excluded.draft, draft_updated_at = excluded.draft_updated_at,
           published = excluded.published, published_at = excluded.published_at`,
        [slug, JSON.stringify(draft), updatedAt, JSON.stringify(published), publishedAt],
      );
    },
    async publish(slug, { doc, publishedAt }) {
      const rows = await db().query(
        `update sites set published = $2::jsonb, published_at = $3, first_published_at = coalesce(first_published_at, $3)
         where slug = $1 returning slug`,
        [slug, JSON.stringify(doc), publishedAt],
      );
      // Publishing needs a draft to publish; silently doing nothing would look like success.
      if (rows.length === 0) throw new Error(`Cannot publish /${slug}: it has no page in the database`);
    },
  };
  return store;
}

/**
 * Makes the Redis page index name every page Postgres has. It only adds: an address left in the index after its page is
 * gone is harmless (the view counter then counts views for a page that 404s), and removing one is a manual decision.
 */
export async function reindexSites(redis: Redis, sites: SiteStore): Promise<{ added: number; total: number }> {
  const slugs = await sites.list();
  const indexed = new Set(await redis.smembers(keys.sites()));
  const missing = slugs.filter((slug) => !indexed.has(slug));
  if (missing.length > 0) await redis.sadd(keys.sites(), missing[0], ...missing.slice(1));
  return { added: missing.length, total: slugs.length };
}
