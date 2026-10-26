import { Lead } from "../../content/schemas";
import { iso, type Db } from "../db/types";

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

type LeadRow = {
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
  };
}
