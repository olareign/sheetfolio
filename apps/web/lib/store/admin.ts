import type { Db } from "../db/types";

/*
 * What only the admin console needs from Postgres: platform totals in one query, and removing an account with everything
 * it owns. Neither belongs in the stores the product itself uses.
 */

export type PlatformTotals = {
  users: number;
  proUsers: number;
  pages: number;
  publishedPages: number;
  suspendedPages: number;
  savedVersions: number;
};

export interface AdminStore {
  totals(): Promise<PlatformTotals>;
  /** Row counts of the tables the app owns, for the system page. */
  tableCounts(): Promise<Record<string, number>>;
  /**
   * Deletes an account and everything it owns in one transaction: the account, its sign-in details, its page, its
   * enquiries, its saved tailored CVs and its stored view history. Nothing is left that could be found by the address.
   */
  purgeAccount(who: { email: string; slug: string }): Promise<void>;
}

const TABLES = [
  "users",
  "credentials",
  "session_epochs",
  "sites",
  "leads",
  "tailored_cvs",
  "tailored_undo",
  "stats_daily",
  "stats_projects",
  "stats_cv",
] as const;

export function adminStore(db: () => Db): AdminStore {
  return {
    async totals() {
      const rows = await db().query<Record<keyof PlatformTotals, number>>(
        `select
           (select count(*) from users)::int as "users",
           (select count(*) from users where plan = 'pro')::int as "proUsers",
           (select count(*) from sites)::int as "pages",
           (select count(*) from sites where published is not null)::int as "publishedPages",
           (select count(*) from sites where draft #>> '{settings,status}' = 'suspended')::int as "suspendedPages",
           (select count(*) from tailored_cvs)::int as "savedVersions"`,
      );
      const r = rows[0];
      return {
        users: Number(r?.users ?? 0),
        proUsers: Number(r?.proUsers ?? 0),
        pages: Number(r?.pages ?? 0),
        publishedPages: Number(r?.publishedPages ?? 0),
        suspendedPages: Number(r?.suspendedPages ?? 0),
        savedVersions: Number(r?.savedVersions ?? 0),
      };
    },
    async tableCounts() {
      const counts: Record<string, number> = {};
      for (const table of TABLES) {
        const rows = await db().query<{ n: number }>(`select count(*)::int as n from ${table}`);
        counts[table] = Number(rows[0]?.n ?? 0);
      }
      return counts;
    },
    async purgeAccount({ email, slug }) {
      const e = email.toLowerCase();
      await db().batch([
        { text: "delete from tailored_undo where slug = $1", params: [slug] },
        { text: "delete from tailored_cvs where slug = $1", params: [slug] },
        { text: "delete from leads where slug = $1", params: [slug] },
        { text: "delete from stats_daily where slug = $1", params: [slug] },
        { text: "delete from stats_projects where slug = $1", params: [slug] },
        { text: "delete from stats_cv where slug = $1", params: [slug] },
        { text: "delete from sites where slug = $1", params: [slug] },
        { text: "delete from credentials where email = $1", params: [e] },
        { text: "delete from session_epochs where email = $1", params: [e] },
        { text: "delete from users where email = $1", params: [e] },
      ]);
    },
  };
}
