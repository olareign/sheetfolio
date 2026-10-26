import type { Redis } from "@upstash/redis";
import { Lead } from "../../content/schemas";
import { iso, type Db } from "../db/types";
import { keys } from "../redis-keys";
import { StoredDataError } from "./errors";
import { read, write, type StoreMode } from "./mode";

/** Enquiries sent from a public page, newest first. Each page keeps its latest 500. */

export const MAX_LEADS = 500;

export interface LeadStore {
  add(slug: string, lead: Lead): Promise<void>;
  /** `page` is zero-based and already checked by the caller. */
  list(slug: string, page: number, pageSize: number): Promise<Lead[]>;
  count(slug: string): Promise<number>;
  unread(slug: string): Promise<number>;
  /** False when there is no such enquiry on this page. Marking one already read is fine. */
  markRead(slug: string, id: string): Promise<boolean>;
  markAllRead(slug: string): Promise<void>;
}

// ── Redis ───────────────────────────────────────────────────────────────────

export function redisLeadStore(redis: () => Redis): LeadStore {
  return {
    async add(slug, lead) {
      const p = redis().multi();
      p.lpush(keys.leads(slug), lead);
      p.ltrim(keys.leads(slug), 0, MAX_LEADS - 1);
      p.incr(keys.leadsUnread(slug));
      await p.exec();
    },
    async list(slug, page, pageSize) {
      const start = page * pageSize;
      const raw = await redis().lrange<unknown>(keys.leads(slug), start, start + pageSize - 1);
      const leads = raw.map((r) => {
        const parsed = Lead.safeParse(r);
        if (!parsed.success)
          throw new StoredDataError(`Stored lead in ${keys.leads(slug)} is invalid`, parsed.error.issues);
        return parsed.data;
      });
      if (leads.length === 0) return leads;
      // The read state lives in a set (not on the stored item), so marking one read never rewrites the list.
      const readFlags = await redis().smismember(
        keys.leadsRead(slug),
        leads.map((l) => l.id),
      );
      return leads.map((l, i) => ({ ...l, read: readFlags[i] === 1 }));
    },
    count: (slug) => redis().llen(keys.leads(slug)),
    async unread(slug) {
      const n = await redis().get<number>(keys.leadsUnread(slug));
      return Math.max(0, Number(n ?? 0));
    },
    async markRead(slug, id) {
      const all = await redis().lrange<{ id?: unknown }>(keys.leads(slug), 0, -1);
      if (!all.some((l) => l.id === id)) return false;
      const added = await redis().sadd(keys.leadsRead(slug), id);
      if (added === 1) {
        const left = await redis().decr(keys.leadsUnread(slug));
        if (left < 0) await redis().set(keys.leadsUnread(slug), 0); // self-heal a drifted counter
      }
      return true;
    },
    async markAllRead(slug) {
      const ids = (await redis().lrange<{ id?: unknown }>(keys.leads(slug), 0, -1))
        .map((l) => l.id)
        .filter((id): id is string => typeof id === "string");
      const tx = redis().multi();
      tx.del(keys.leadsRead(slug));
      if (ids.length) tx.sadd(keys.leadsRead(slug), ...(ids as [string, ...string[]]));
      // A lead arriving between the read above and this write would be counted as read; the window is
      // milliseconds and the lead itself still shows as unread in the inbox.
      tx.set(keys.leadsUnread(slug), 0);
      await tx.exec();
    },
  };
}

// ── Postgres ────────────────────────────────────────────────────────────────

type LeadRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  read: boolean;
  created_at: unknown;
};

export type PgLeadStore = LeadStore & {
  /** For the backfill: inserts the enquiry, or sets its read state if it is already there. */
  upsert(slug: string, lead: Lead): Promise<void>;
};

export function pgLeadStore(db: () => Db): PgLeadStore {
  const insert = (slug: string, l: Lead, tail: string) => ({
    text: `insert into leads (id, slug, name, email, company, message, read, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8) ${tail}`,
    params: [l.id, slug, l.name, l.email, l.company ?? null, l.message, l.read, l.createdAt],
  });
  return {
    async add(slug, lead) {
      await db().batch([
        // Adding the same enquiry twice (a retry, or the backfill overlapping a live write) changes nothing.
        insert(slug, lead, "on conflict (id) do nothing"),
        {
          text: `delete from leads where slug = $1 and id in (
                   select id from leads where slug = $1 order by created_at desc, id desc offset ${MAX_LEADS})`,
          params: [slug],
        },
      ]);
    },
    async list(slug, page, pageSize) {
      const rows = await db().query<LeadRow>(
        `select id, name, email, company, message, read, created_at from leads
         where slug = $1 order by created_at desc, id desc limit $2 offset $3`,
        [slug, pageSize, page * pageSize],
      );
      return rows.map((r) =>
        Lead.parse({
          id: r.id,
          name: r.name,
          email: r.email,
          ...(r.company && { company: r.company }),
          message: r.message,
          read: r.read,
          createdAt: iso(r.created_at),
        }),
      );
    },
    async count(slug) {
      const rows = await db().query<{ n: number }>("select count(*)::int as n from leads where slug = $1", [slug]);
      return Number(rows[0]?.n ?? 0);
    },
    async unread(slug) {
      const rows = await db().query<{ n: number }>(
        "select count(*)::int as n from leads where slug = $1 and not read",
        [slug],
      );
      return Number(rows[0]?.n ?? 0);
    },
    async markRead(slug, id) {
      const rows = await db().query("update leads set read = true where slug = $1 and id = $2 returning id", [
        slug,
        id,
      ]);
      return rows.length > 0;
    },
    async markAllRead(slug) {
      await db().query("update leads set read = true where slug = $1 and not read", [slug]);
    },
    async upsert(slug, lead) {
      const s = insert(slug, lead, "on conflict (id) do update set read = excluded.read");
      await db().query(s.text, s.params);
    },
  };
}

// ── Both, according to the mode ─────────────────────────────────────────────

export function leadStore(mode: StoreMode, redis: LeadStore, pg: LeadStore): LeadStore {
  return {
    add: async (slug, lead) => {
      await write(mode, "save enquiry", { redis: () => redis.add(slug, lead), pg: () => pg.add(slug, lead) });
    },
    list: (slug, page, size) =>
      read(mode, { redis: () => redis.list(slug, page, size), pg: () => pg.list(slug, page, size) }),
    count: (slug) => read(mode, { redis: () => redis.count(slug), pg: () => pg.count(slug) }),
    unread: (slug) => read(mode, { redis: () => redis.unread(slug), pg: () => pg.unread(slug) }),
    markRead: (slug, id) =>
      write(mode, "mark enquiry read", { redis: () => redis.markRead(slug, id), pg: () => pg.markRead(slug, id) }),
    markAllRead: async (slug) => {
      await write(mode, "mark enquiries read", {
        redis: () => redis.markAllRead(slug),
        pg: () => pg.markAllRead(slug),
      });
    },
  };
}
