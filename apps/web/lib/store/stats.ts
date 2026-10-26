import type { Redis } from "@upstash/redis";
import type { Db } from "../db/types";

/*
 * View and download counters. The live counters stay in Redis: they are bumped on every public visit, and Redis answers
 * that without waking the database. What lives in Postgres is a durable copy of their totals, written by a daily job:
 * history that outlasts Redis's 90-day expiry, and a way back if Redis is ever lost.
 *
 * A copy only ever raises a number (greatest of the two), and a restore only fills in what Redis is missing, so both
 * are safe to repeat and neither can turn a count down.
 */

export type DailyRow = { slug: string; day: string; views: number };
export type ProjectRow = { slug: string; projectId: string; views: number };
export type CvRow = { slug: string; downloads: number };
export type StatsSnapshot = { daily: DailyRow[]; projects: ProjectRow[]; cv: CvRow[] };

export type StatsCounts = { daily: number; projects: number; cv: number };
export const countsOf = (s: StatsSnapshot): StatsCounts => ({
  daily: s.daily.length,
  projects: s.projects.length,
  cv: s.cv.length,
});

/** Redis daily counters expire after this long (lib/site.ts); a restore must not bring back older ones. */
export const DAILY_TTL_SECONDS = 90 * 24 * 60 * 60;

const DAILY_KEY = /^views:([^:]+):(\d{4}-\d{2}-\d{2})$/;
const PROJECT_KEY = /^views:([^:]+):p:(.+)$/;
const CV_KEY = /^cv:([^:]+):downloads$/;

async function scanKeys(redis: Redis, match: string): Promise<string[]> {
  const found: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match, count: 500 });
    cursor = String(next);
    found.push(...batch);
  } while (cursor !== "0");
  return found;
}

async function valuesOf(redis: Redis, keys: string[]): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    const chunk = keys.slice(i, i + 100);
    const got = await redis.mget<(number | string | null)[]>(...chunk);
    out.push(...got.map((v) => Number(v ?? 0)));
  }
  return out;
}

/** Every live counter in Redis. A zero, a negative or a non-number is skipped: there is nothing worth keeping. */
export async function readLiveStats(redis: Redis): Promise<StatsSnapshot> {
  const keys = await scanKeys(redis, "views:*");
  const cvKeys = await scanKeys(redis, "cv:*");
  const daily: { slug: string; day: string; key: string }[] = [];
  const projects: { slug: string; projectId: string; key: string }[] = [];
  for (const key of keys) {
    const d = DAILY_KEY.exec(key);
    if (d) {
      daily.push({ slug: d[1]!, day: d[2]!, key });
      continue;
    }
    const p = PROJECT_KEY.exec(key);
    if (p) projects.push({ slug: p[1]!, projectId: p[2]!, key });
  }
  const cv = cvKeys.flatMap((key) => {
    const m = CV_KEY.exec(key);
    return m ? [{ slug: m[1]!, key }] : [];
  });

  const [dailyValues, projectValues, cvValues] = await Promise.all([
    valuesOf(
      redis,
      daily.map((x) => x.key),
    ),
    valuesOf(
      redis,
      projects.map((x) => x.key),
    ),
    valuesOf(
      redis,
      cv.map((x) => x.key),
    ),
  ]);
  const keep = (n: number) => Number.isFinite(n) && n > 0;
  return {
    daily: daily.flatMap((x, i) =>
      keep(dailyValues[i]!) ? [{ slug: x.slug, day: x.day, views: dailyValues[i]! }] : [],
    ),
    projects: projects.flatMap((x, i) =>
      keep(projectValues[i]!) ? [{ slug: x.slug, projectId: x.projectId, views: projectValues[i]! }] : [],
    ),
    cv: cv.flatMap((x, i) => (keep(cvValues[i]!) ? [{ slug: x.slug, downloads: cvValues[i]! }] : [])),
  };
}

// ── The durable copy, in Postgres ───────────────────────────────────────────

export interface StatsArchive {
  /** Raises each stored total to at least this value (inserting what is new). Never lowers one. */
  save(snapshot: StatsSnapshot): Promise<void>;
  load(): Promise<StatsSnapshot>;
}

const CHUNK = 500;
const chunks = <T>(rows: T[]): T[][] =>
  Array.from({ length: Math.ceil(rows.length / CHUNK) }, (_, i) => rows.slice(i * CHUNK, (i + 1) * CHUNK));

export function pgStatsArchive(db: () => Db): StatsArchive {
  return {
    async save({ daily, projects, cv }) {
      for (const rows of chunks(daily)) {
        await db().query(
          `insert into stats_daily (slug, day, views)
           select t.slug, t.day::date, t.views from jsonb_to_recordset($1::jsonb) as t(slug text, day text, views integer)
           on conflict (slug, day) do update set views = greatest(stats_daily.views, excluded.views)`,
          [JSON.stringify(rows)],
        );
      }
      for (const rows of chunks(projects)) {
        await db().query(
          `insert into stats_projects (slug, project_id, views)
           select t.slug, t."projectId", t.views from jsonb_to_recordset($1::jsonb) as t(slug text, "projectId" text, views integer)
           on conflict (slug, project_id) do update set views = greatest(stats_projects.views, excluded.views)`,
          [JSON.stringify(rows)],
        );
      }
      for (const rows of chunks(cv)) {
        await db().query(
          `insert into stats_cv (slug, downloads)
           select t.slug, t.downloads from jsonb_to_recordset($1::jsonb) as t(slug text, downloads integer)
           on conflict (slug) do update set downloads = greatest(stats_cv.downloads, excluded.downloads)`,
          [JSON.stringify(rows)],
        );
      }
    },
    async load() {
      const [daily, projects, cv] = await Promise.all([
        db().query<{ slug: string; day: string; views: number }>(
          "select slug, to_char(day, 'YYYY-MM-DD') as day, views from stats_daily order by slug, day",
        ),
        db().query<{ slug: string; project_id: string; views: number }>(
          "select slug, project_id, views from stats_projects order by slug, project_id",
        ),
        db().query<{ slug: string; downloads: number }>("select slug, downloads from stats_cv order by slug"),
      ]);
      return {
        daily: daily.map((r) => ({ slug: r.slug, day: r.day, views: Number(r.views) })),
        projects: projects.map((r) => ({ slug: r.slug, projectId: r.project_id, views: Number(r.views) })),
        cv: cv.map((r) => ({ slug: r.slug, downloads: Number(r.downloads) })),
      };
    },
  };
}

// ── The two jobs ────────────────────────────────────────────────────────────

/** Copies the live totals into the archive. Returns how many counters it looked at. */
export async function flushStats(redis: Redis, archive: StatsArchive): Promise<StatsCounts> {
  const live = await readLiveStats(redis);
  await archive.save(live);
  return countsOf(live);
}

/**
 * Puts archived totals back into Redis where Redis has less (or nothing). Daily counters older than Redis keeps them are
 * not restored. With `apply: false` it only counts what it would do.
 */
export async function restoreStats(
  redis: Redis,
  archive: StatsArchive,
  opts: { apply: boolean; now?: Date },
): Promise<StatsCounts> {
  const now = opts.now ?? new Date();
  const saved = await archive.load();
  const live = await readLiveStats(redis);
  const liveDaily = new Map(live.daily.map((r) => [`${r.slug}|${r.day}`, r.views]));
  const liveProjects = new Map(live.projects.map((r) => [`${r.slug}|${r.projectId}`, r.views]));
  const liveCv = new Map(live.cv.map((r) => [r.slug, r.downloads]));
  const done: StatsCounts = { daily: 0, projects: 0, cv: 0 };

  for (const r of saved.daily) {
    const expiresAt = Date.parse(`${r.day}T00:00:00Z`) + DAILY_TTL_SECONDS * 1000;
    const ttl = Math.floor((expiresAt - now.getTime()) / 1000);
    if (ttl <= 0 || (liveDaily.get(`${r.slug}|${r.day}`) ?? 0) >= r.views) continue;
    done.daily += 1;
    if (opts.apply) await redis.set(`views:${r.slug}:${r.day}`, r.views, { ex: ttl });
  }
  for (const r of saved.projects) {
    if ((liveProjects.get(`${r.slug}|${r.projectId}`) ?? 0) >= r.views) continue;
    done.projects += 1;
    if (opts.apply) await redis.set(`views:${r.slug}:p:${r.projectId}`, r.views);
  }
  for (const r of saved.cv) {
    if ((liveCv.get(r.slug) ?? 0) >= r.downloads) continue;
    done.cv += 1;
    if (opts.apply) await redis.set(`cv:${r.slug}:downloads`, r.downloads);
  }
  return done;
}
