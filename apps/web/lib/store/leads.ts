import { Lead } from "../../content/schemas";
import { iso, type Db } from "../db/types";

/** Enquiries sent from a public page, newest first. Each page keeps its latest 500. */

export const MAX_LEADS = 500;

export type LeadWithSlug = Lead & { slug: string };
export type LeadSearch = {
  /** Matches the sender's name, email, company or message, or the page address. */
  q?: string;
  slug?: string;
  unreadOnly?: boolean;
  /** Zero-based. */
  page: number;
  pageSize: number;
};

export interface LeadStore {
  add(slug: string, lead: Lead): Promise<void>;
  /** `page` is zero-based and already checked by the caller. */
  list(slug: string, page: number, pageSize: number): Promise<Lead[]>;
  count(slug: string): Promise<number>;
  unread(slug: string): Promise<number>;
  /** False when there is no such enquiry on this page. Marking one already read is fine. */
  markRead(slug: string, id: string): Promise<boolean>;
  markAllRead(slug: string): Promise<void>;
  /** Enquiries across every page, newest first, for the admin console. */
  search(query: LeadSearch): Promise<{ rows: LeadWithSlug[]; total: number }>;
  /** Totals across every page: all enquiries and the unread ones. */
  totals(): Promise<{ total: number; unread: number }>;
  /** Enquiry counts for every page that has any, in one query. */
  countsBySlug(): Promise<Map<string, { total: number; unread: number }>>;
  /** Deletes one enquiry. False when there is no such enquiry on that page. */
  remove(slug: string, id: string): Promise<boolean>;
}

type LeadRow = {
  slug?: string;
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  read: boolean;
  created_at: unknown;
};

export function leadStore(db: () => Db): LeadStore {
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
    async search({ q, slug, unreadOnly, page, pageSize }) {
      const where: string[] = [];
      const params: unknown[] = [];
      const arg = (value: unknown) => `$${params.push(value)}`;
      if (slug) where.push(`slug = ${arg(slug)}`);
      if (unreadOnly) where.push("not read");
      if (q?.trim()) {
        // % and _ typed by the admin match themselves, not "anything".
        const like = arg(`%${q.trim().replace(/[\\%_]/g, "\\$&")}%`);
        where.push(
          `(name ilike ${like} or email ilike ${like} or coalesce(company, '') ilike ${like} or message ilike ${like} or slug ilike ${like})`,
        );
      }
      const clause = where.length ? `where ${where.join(" and ")}` : "";
      const total = await db().query<{ n: number }>(`select count(*)::int as n from leads ${clause}`, params);
      const rows = await db().query<LeadRow>(
        `select slug, id, name, email, company, message, read, created_at from leads ${clause}
         order by created_at desc, id desc limit ${arg(pageSize)} offset ${arg(page * pageSize)}`,
        params,
      );
      return {
        total: Number(total[0]?.n ?? 0),
        rows: rows.map((r) => ({
          slug: r.slug as string,
          ...Lead.parse({
            id: r.id,
            name: r.name,
            email: r.email,
            ...(r.company && { company: r.company }),
            message: r.message,
            read: r.read,
            createdAt: iso(r.created_at),
          }),
        })),
      };
    },
    async totals() {
      const rows = await db().query<{ total: number; unread: number }>(
        "select count(*)::int as total, count(*) filter (where not read)::int as unread from leads",
      );
      return { total: Number(rows[0]?.total ?? 0), unread: Number(rows[0]?.unread ?? 0) };
    },
    async countsBySlug() {
      const rows = await db().query<{ slug: string; total: number; unread: number }>(
        "select slug, count(*)::int as total, count(*) filter (where not read)::int as unread from leads group by slug",
      );
      return new Map(rows.map((r) => [r.slug, { total: Number(r.total), unread: Number(r.unread) }]));
    },
    async remove(slug, id) {
      const rows = await db().query("delete from leads where slug = $1 and id = $2 returning id", [slug, id]);
      return rows.length > 0;
    },
  };
}
