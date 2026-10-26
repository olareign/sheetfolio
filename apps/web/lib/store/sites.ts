import type { Redis } from "@upstash/redis";
import { iso, type Db } from "../db/types";
import { keys } from "../redis-keys";
import { mirrorOf, primaryOf, read, type StoreMode } from "./mode";

/*
 * A page's documents: the draft the owner edits, the published copy visitors see, and when it first went live.
 * The documents are opaque here (JSON); lib/site.ts checks their shape on the way in and out.
 *
 * The set of registered page addresses ("sites" in Redis) also stays in Redis in every mode, as a fast index: the
 * view counter asks "is this a real page?" on every visit, and that must not wake the database each time.
 */

export type SiteSnapshot = {
  draft: unknown;
  published: unknown | null;
  firstPublishedAt: string | null;
};

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
  /** Everything stored for a page, or null when there is nothing. Used to copy a page whole. */
  snapshot(slug: string): Promise<SiteSnapshot | null>;
  /** Makes the stored page exactly this, registering it. The inverse of `snapshot`. */
  restore(slug: string, snapshot: SiteSnapshot): Promise<void>;
}

// ── Redis ───────────────────────────────────────────────────────────────────

export function redisSiteStore(redis: () => Redis): SiteStore {
  const store: SiteStore = {
    getDraft: (slug) => redis().get<unknown>(keys.draft(slug)),
    getPublished: (slug) => redis().get<unknown>(keys.published(slug)),
    firstPublishedAt: (slug) => redis().get<string>(keys.firstPublished(slug)),
    list: () => redis().smembers(keys.sites()),
    async create(slug, draft) {
      const tx = redis().multi();
      tx.set(keys.draft(slug), draft);
      tx.sadd(keys.sites(), slug);
      await tx.exec();
    },
    async put(slug, docs) {
      const tx = redis().multi();
      tx.set(keys.draft(slug), docs.draft);
      if (docs.published !== undefined) tx.set(keys.published(slug), docs.published);
      await tx.exec();
    },
    async publish(slug, { doc, publishedAt }) {
      const tx = redis().multi();
      tx.set(keys.published(slug), doc);
      tx.set(keys.firstPublished(slug), publishedAt, { nx: true });
      await tx.exec();
    },
    async snapshot(slug) {
      const [draft, published, firstPublishedAt] = await Promise.all([
        store.getDraft(slug),
        store.getPublished(slug),
        store.firstPublishedAt(slug),
      ]);
      return draft === null ? null : { draft, published, firstPublishedAt };
    },
    async restore(slug, s) {
      const tx = redis().multi();
      tx.set(keys.draft(slug), s.draft);
      if (s.published === null) tx.del(keys.published(slug));
      else tx.set(keys.published(slug), s.published);
      if (s.firstPublishedAt === null) tx.del(keys.firstPublished(slug));
      else tx.set(keys.firstPublished(slug), s.firstPublishedAt);
      tx.sadd(keys.sites(), slug);
      await tx.exec();
    },
  };
  return store;
}

// ── Postgres ────────────────────────────────────────────────────────────────

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

export function pgSiteStore(db: () => Db): SiteStore {
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
    async snapshot(slug) {
      const rows = await db().query<{ draft: unknown; published: unknown; first: unknown }>(
        "select draft, published, first_published_at as first from sites where slug = $1",
        [slug],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        draft: row.draft,
        published: row.published ?? null,
        firstPublishedAt: row.first ? iso(row.first) : null,
      };
    },
    async restore(slug, s) {
      const publishedAt =
        s.published === null ? null : publishedStamp(s.published, s.firstPublishedAt, stamp(s.draft, "updatedAt"));
      await db().query(
        `insert into sites (slug, draft, draft_updated_at, published, published_at, first_published_at)
         values ($1, $2::jsonb, $3, $4::jsonb, $5, $6)
         on conflict (slug) do update set draft = excluded.draft, draft_updated_at = excluded.draft_updated_at,
           published = excluded.published, published_at = excluded.published_at,
           first_published_at = excluded.first_published_at`,
        [
          slug,
          JSON.stringify(s.draft),
          stamp(s.draft, "updatedAt") ?? new Date().toISOString(),
          s.published === null ? null : JSON.stringify(s.published),
          publishedAt,
          s.firstPublishedAt,
        ],
      );
    },
  };
  return store;
}

// ── Both, according to the mode ─────────────────────────────────────────────

/**
 * Reads come from the primary side. A write goes to the primary side, and then the mirror side gets a copy of the whole
 * page as the primary now holds it, rather than a repeat of the one change. So any save also repairs a page the
 * mirror was missing or had behind, and a failed copy is just a gap for the next save or the backfill to close.
 */
export function siteStore(
  mode: StoreMode,
  redis: SiteStore,
  pg: SiteStore,
  /** Adds a page address to the Redis index (needed when Redis is not receiving the copy). */
  indexAdd: (slug: string) => Promise<void>,
): SiteStore {
  const side = { redis, pg };
  const primary = side[primaryOf(mode)];
  const mirrorSide = mirrorOf(mode);

  async function mutate(slug: string, label: string, op: (s: SiteStore) => Promise<void>): Promise<void> {
    await op(primary);
    if (!mirrorSide) return;
    try {
      const snapshot = await primary.snapshot(slug);
      if (snapshot) await side[mirrorSide].restore(slug, snapshot);
    } catch (err) {
      console.error(`[store] ${label}: copy to ${mirrorSide} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return {
    getDraft: (slug) => read(mode, { redis: () => redis.getDraft(slug), pg: () => pg.getDraft(slug) }),
    getPublished: (slug) => read(mode, { redis: () => redis.getPublished(slug), pg: () => pg.getPublished(slug) }),
    firstPublishedAt: (slug) =>
      read(mode, { redis: () => redis.firstPublishedAt(slug), pg: () => pg.firstPublishedAt(slug) }),
    list: () => read(mode, { redis: () => redis.list(), pg: () => pg.list() }),
    async create(slug, draft) {
      await mutate(slug, "create page", (s) => s.create(slug, draft));
      // With Postgres alone the page address still has to reach the Redis index, or its views would not be counted.
      if (mode === "postgres") {
        try {
          await indexAdd(slug);
        } catch (err) {
          console.error("[store] register page: index update failed:", err instanceof Error ? err.message : err);
        }
      }
    },
    put: (slug, docs) => mutate(slug, "save page", (s) => s.put(slug, docs)),
    publish: (slug, p) => mutate(slug, "publish page", (s) => s.publish(slug, p)),
    snapshot: (slug) => primary.snapshot(slug),
    restore: (slug, s) => mutate(slug, "restore page", (st) => st.restore(slug, s)),
  };
}
